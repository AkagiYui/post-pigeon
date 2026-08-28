package services

import (
	"context"
	"crypto/md5"
	"crypto/rand"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// 本文件实现两种需要额外往返的认证：
//   - Digest：必须先收到服务端 401 挑战，才能算出 Authorization 响应值
//   - OAuth 2.0：需要先向 token 端点换取 access_token（带缓存，避免每次请求都换）

// ---- Digest ----

// digestChallenge 是从 WWW-Authenticate 头解析出的挑战参数。
type digestChallenge struct {
	Realm     string
	Nonce     string
	Opaque    string
	Algorithm string
	QOP       string
	Stale     bool
}

// parseDigestChallenge 解析 `Digest realm="x", nonce="y", qop="auth"` 形式的挑战。
// 头里可能同时给出多种认证方案，只取 Digest 那一段。
func parseDigestChallenge(header string) (digestChallenge, bool) {
	trimmed := strings.TrimSpace(header)
	if !strings.HasPrefix(strings.ToLower(trimmed), "digest ") {
		return digestChallenge{}, false
	}
	params := trimmed[len("Digest "):]

	challenge := digestChallenge{Algorithm: "MD5"}
	for _, part := range splitDigestParams(params) {
		key, value, ok := strings.Cut(part, "=")
		if !ok {
			continue
		}
		key = strings.ToLower(strings.TrimSpace(key))
		value = strings.Trim(strings.TrimSpace(value), `"`)
		switch key {
		case "realm":
			challenge.Realm = value
		case "nonce":
			challenge.Nonce = value
		case "opaque":
			challenge.Opaque = value
		case "algorithm":
			challenge.Algorithm = strings.ToUpper(value)
		case "qop":
			challenge.QOP = value
		case "stale":
			challenge.Stale = strings.EqualFold(value, "true")
		}
	}
	if challenge.Nonce == "" {
		return digestChallenge{}, false
	}
	return challenge, true
}

// splitDigestParams 按逗号切分参数，但忽略引号内的逗号（realm 里可能带逗号）。
func splitDigestParams(s string) []string {
	var (
		parts   []string
		current strings.Builder
		inQuote bool
	)
	for _, r := range s {
		switch {
		case r == '"':
			inQuote = !inQuote
			current.WriteRune(r)
		case r == ',' && !inQuote:
			parts = append(parts, current.String())
			current.Reset()
		default:
			current.WriteRune(r)
		}
	}
	if current.Len() > 0 {
		parts = append(parts, current.String())
	}
	return parts
}

// digestHash 按挑战指定的算法计算摘要。
func digestHash(algorithm, data string) string {
	switch strings.ToUpper(strings.TrimSuffix(algorithm, "-SESS")) {
	case "SHA-256":
		sum := sha256.Sum256([]byte(data))
		return hex.EncodeToString(sum[:])
	case "SHA-512-256":
		sum := sha512.Sum512_256([]byte(data))
		return hex.EncodeToString(sum[:])
	default: // MD5
		sum := md5.Sum([]byte(data)) //nolint:gosec // RFC 7616 规定的默认算法，由服务端选择
		return hex.EncodeToString(sum[:])
	}
}

// buildDigestAuthorization 依据挑战与凭据算出 Authorization 头的值。
func buildDigestAuthorization(challenge digestChallenge, username, password, method, uri, body string) (string, error) {
	cnonce, err := randomHex(16)
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeAuthConfigInvalid, apperr.P("type", "digest"))
	}
	const nonceCount = "00000001"

	ha1 := digestHash(challenge.Algorithm, username+":"+challenge.Realm+":"+password)
	if strings.HasSuffix(strings.ToUpper(challenge.Algorithm), "-SESS") {
		ha1 = digestHash(challenge.Algorithm, ha1+":"+challenge.Nonce+":"+cnonce)
	}

	qop := pickDigestQOP(challenge.QOP)
	a2 := method + ":" + uri
	if qop == "auth-int" {
		a2 += ":" + digestHash(challenge.Algorithm, body)
	}
	ha2 := digestHash(challenge.Algorithm, a2)

	var response string
	if qop == "" {
		response = digestHash(challenge.Algorithm, ha1+":"+challenge.Nonce+":"+ha2)
	} else {
		response = digestHash(challenge.Algorithm,
			strings.Join([]string{ha1, challenge.Nonce, nonceCount, cnonce, qop, ha2}, ":"))
	}

	fields := []string{
		fmt.Sprintf(`username=%q`, username),
		fmt.Sprintf(`realm=%q`, challenge.Realm),
		fmt.Sprintf(`nonce=%q`, challenge.Nonce),
		fmt.Sprintf(`uri=%q`, uri),
		fmt.Sprintf(`response=%q`, response),
	}
	if challenge.Algorithm != "" {
		fields = append(fields, "algorithm="+challenge.Algorithm)
	}
	if qop != "" {
		fields = append(fields,
			"qop="+qop,
			"nc="+nonceCount,
			fmt.Sprintf(`cnonce=%q`, cnonce),
		)
	}
	if challenge.Opaque != "" {
		fields = append(fields, fmt.Sprintf(`opaque=%q`, challenge.Opaque))
	}
	return "Digest " + strings.Join(fields, ", "), nil
}

// pickDigestQOP 从挑战给出的候选中选一个受支持的 qop。
func pickDigestQOP(qop string) string {
	options := strings.SplitSeq(qop, ",")
	for option := range options {
		switch strings.TrimSpace(option) {
		case "auth":
			return "auth"
		case "auth-int":
			return "auth-int"
		}
	}
	return ""
}

// randomHex 生成 n 字节的随机十六进制串（用作 cnonce）。
func randomHex(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// ---- OAuth 2.0 ----

// oauthToken 是缓存中的一条访问令牌。
type oauthToken struct {
	accessToken string
	tokenType   string
	expiresAt   time.Time
}

// valid 判断令牌是否仍可用（留 30 秒安全边界，避免边界处刚好过期）。
func (t oauthToken) valid(now time.Time) bool {
	if t.accessToken == "" {
		return false
	}
	if t.expiresAt.IsZero() {
		return true
	}
	return now.Add(30 * time.Second).Before(t.expiresAt)
}

// oauthTokenCache 按「token 端点 + 凭据」缓存令牌，避免每个请求都换一次 token。
var (
	oauthMu    sync.Mutex
	oauthCache = map[string]oauthToken{}
)

// fetchOAuth2Token 取得（或复用缓存的）访问令牌。
func fetchOAuth2Token(ctx context.Context, client *http.Client, data models.OAuth2AuthData, vars map[string]string) (string, error) {
	resolved := models.OAuth2AuthData{
		GrantType:    defaultStr(data.GrantType, string(models.OAuth2GrantClientCredentials)),
		TokenURL:     resolveVars(data.TokenURL, vars),
		ClientID:     resolveVars(data.ClientID, vars),
		ClientSecret: resolveVars(data.ClientSecret, vars),
		Scope:        resolveVars(data.Scope, vars),
		Username:     resolveVars(data.Username, vars),
		Password:     resolveVars(data.Password, vars),
		ClientAuth:   data.ClientAuth,
		HeaderPrefix: data.HeaderPrefix,
	}
	if strings.TrimSpace(resolved.TokenURL) == "" {
		return "", apperr.New(apperr.CodeAuthConfigInvalid, apperr.P("type", "oauth2"))
	}

	cacheKey := strings.Join([]string{
		resolved.TokenURL, resolved.GrantType, resolved.ClientID,
		resolved.ClientSecret, resolved.Scope, resolved.Username,
	}, "\x00")

	now := time.Now()
	oauthMu.Lock()
	if token, ok := oauthCache[cacheKey]; ok && token.valid(now) {
		oauthMu.Unlock()
		return authorizationValue(resolved, token), nil
	}
	oauthMu.Unlock()

	form := url.Values{}
	form.Set("grant_type", resolved.GrantType)
	if resolved.Scope != "" {
		form.Set("scope", resolved.Scope)
	}
	if resolved.GrantType == string(models.OAuth2GrantPassword) {
		form.Set("username", resolved.Username)
		form.Set("password", resolved.Password)
	}
	// 凭据位置：RFC 6749 允许放在 Basic 头或请求体，服务端实现不一
	useBasic := strings.EqualFold(resolved.ClientAuth, "basic")
	if !useBasic {
		form.Set("client_id", resolved.ClientID)
		form.Set("client_secret", resolved.ClientSecret)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, resolved.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeBuildRequest)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	if useBasic {
		req.SetBasicAuth(resolved.ClientID, resolved.ClientSecret)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeSendRequest)
	}
	defer resp.Body.Close()

	// token 响应通常很小，这里给一个宽松但有限的上限，避免异常服务端拖垮内存
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeReadResponse)
	}
	if resp.StatusCode >= 400 {
		return "", apperr.New(apperr.CodeAuthConfigInvalid,
			apperr.P("type", "oauth2"), apperr.P("status", resp.StatusCode))
	}

	var payload struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &payload); err != nil || payload.AccessToken == "" {
		return "", apperr.New(apperr.CodeAuthConfigInvalid, apperr.P("type", "oauth2"))
	}

	token := oauthToken{accessToken: payload.AccessToken, tokenType: payload.TokenType}
	if payload.ExpiresIn > 0 {
		token.expiresAt = now.Add(time.Duration(payload.ExpiresIn) * time.Second)
	}

	oauthMu.Lock()
	oauthCache[cacheKey] = token
	oauthMu.Unlock()

	return authorizationValue(resolved, token), nil
}

// authorizationValue 组装 Authorization 头的值。
func authorizationValue(data models.OAuth2AuthData, token oauthToken) string {
	prefix := defaultStr(data.HeaderPrefix, defaultStr(token.tokenType, "Bearer"))
	return prefix + " " + token.accessToken
}

// clearOAuthTokenCache 清空令牌缓存（供测试与「强制重新获取」使用）。
func clearOAuthTokenCache() {
	oauthMu.Lock()
	oauthCache = map[string]oauthToken{}
	oauthMu.Unlock()
}
