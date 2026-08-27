package services

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"PostPigeon/internal/apperr"
)

// maxImportDocumentBytes 是「从 URL 导入」允许读取的文档大小上限。
// 导出的接口文档再大也很难上 32MB，超过这个量级多半是把一个下载地址填了进来，
// 与其把几百 MB 读进内存，不如直接报错让用户改用文件导入。
const maxImportDocumentBytes = 32 << 20

// importFetchTimeout 是单次拉取的总超时。文档动辄几 MB，留得比普通请求宽松些。
const importFetchTimeout = 60 * time.Second

// FetchImportDocument 拉取一个远程接口文档（Postman / Apifox / OpenAPI 的导出地址），
// 返回正文文本，交给前端继续走既有的预览流程。
//
// 走后端而不是前端 fetch：WebView 里的跨域请求会被 CORS 拦下，而这里既没有这层限制，
// 也能顺带把「只允许 http/https」「响应体封顶」这两条约束落到一处。
func (s *ImportExportService) FetchImportDocument(rawURL string) (string, error) {
	target := strings.TrimSpace(rawURL)
	if target == "" {
		return "", apperr.New(apperr.CodeInvalidURL)
	}
	// 用户常常只粘贴 example.com/openapi.json，补一个默认协议
	if !strings.Contains(target, "://") {
		target = "https://" + target
	}
	parsed, err := url.Parse(target)
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeInvalidURL)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", apperr.New(apperr.CodeInvalidURL)
	}
	if parsed.Host == "" {
		return "", apperr.New(apperr.CodeInvalidURL)
	}

	req, err := http.NewRequest(http.MethodGet, parsed.String(), nil)
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeBuildRequest)
	}
	req.Header.Set("Accept", "application/json, application/yaml, text/plain, */*")

	client := &http.Client{Timeout: importFetchTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeImportFetch)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", apperr.New(apperr.CodeImportFetch, apperr.P("status", resp.StatusCode))
	}

	// 多读一个字节，用来区分「正好到上限」与「已经超出上限」
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxImportDocumentBytes+1))
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeReadResponse)
	}
	if len(body) > maxImportDocumentBytes {
		return "", apperr.New(apperr.CodeResponseTooLarge)
	}
	text := strings.TrimSpace(string(body))
	if text == "" {
		return "", apperr.Wrap(fmt.Errorf("响应内容为空"), apperr.CodeImportParse)
	}
	return text, nil
}
