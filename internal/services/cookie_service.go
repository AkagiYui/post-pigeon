package services

import (
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"sync"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// CookieService 管理按项目持久化的 Cookie，并为 HTTP 请求提供 cookie jar。
//
// 之所以要有它：此前每个请求各起一个内存 jar，登录接口返回的会话 cookie
// 随请求结束一起消失，后续接口只能手工把 Cookie 头抄一遍。
type CookieService struct {
	db *gorm.DB

	mu   sync.Mutex
	jars map[string]*persistentJar // projectID -> jar
}

// NewCookieService 创建 Cookie 服务实例。
func NewCookieService(db *gorm.DB) *CookieService {
	return &CookieService{db: db, jars: map[string]*persistentJar{}}
}

// ---- 对前端暴露的管理接口 ----

// ListCookies 列出某项目下的全部 Cookie（按域名、路径、名称排序）。
func (s *CookieService) ListCookies(projectID string) ([]models.StoredCookie, error) {
	var list []models.StoredCookie
	if err := s.db.Where("project_id = ?", projectID).
		Order("domain ASC, path ASC, name ASC").Find(&list).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeDatabase)
	}
	return list, nil
}

// UpsertCookie 新增或更新一条 Cookie（手工编辑入口）。
func (s *CookieService) UpsertCookie(cookie models.StoredCookie) error {
	if strings.TrimSpace(cookie.ProjectID) == "" || strings.TrimSpace(cookie.Name) == "" ||
		strings.TrimSpace(cookie.Domain) == "" {
		return apperr.New(apperr.CodeInvalidInput, apperr.P("field", "cookie"))
	}
	if strings.TrimSpace(cookie.Path) == "" {
		cookie.Path = "/"
	}
	if err := s.saveCookie(&cookie); err != nil {
		return err
	}
	s.invalidateJar(cookie.ProjectID)
	return nil
}

// DeleteCookie 删除一条 Cookie。
func (s *CookieService) DeleteCookie(id string) error {
	var cookie models.StoredCookie
	if err := s.db.Where("id = ?", id).First(&cookie).Error; err != nil {
		return apperr.Wrap(err, apperr.CodeNotFound, apperr.P("id", id))
	}
	if err := s.db.Delete(&cookie).Error; err != nil {
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	s.invalidateJar(cookie.ProjectID)
	return nil
}

// ClearCookies 清空某项目下的全部 Cookie（相当于「退出登录」）。
func (s *CookieService) ClearCookies(projectID string) error {
	if err := s.db.Where("project_id = ?", projectID).Delete(&models.StoredCookie{}).Error; err != nil {
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	s.invalidateJar(projectID)
	return nil
}

// PruneExpiredCookies 清理已过期的 Cookie。
func (s *CookieService) PruneExpiredCookies(projectID string) error {
	err := s.db.Where("project_id = ? AND expires IS NOT NULL AND expires < ?", projectID, time.Now()).
		Delete(&models.StoredCookie{}).Error
	if err != nil {
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	s.invalidateJar(projectID)
	return nil
}

// ---- jar ----

// JarFor 返回某项目的持久化 cookie jar。projectID 为空时退化为一次性内存 jar，
// 保证未保存的临时请求也能在自身的重定向链里正确携带 cookie。
func (s *CookieService) JarFor(projectID string) http.CookieJar {
	if projectID == "" {
		jar, _ := cookiejar.New(nil)
		return jar
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if jar, ok := s.jars[projectID]; ok {
		return jar
	}
	jar := newPersistentJar(s, projectID)
	s.jars[projectID] = jar
	return jar
}

// invalidateJar 丢弃某项目的内存 jar，下次请求时按数据库重新装载。
func (s *CookieService) invalidateJar(projectID string) {
	s.mu.Lock()
	delete(s.jars, projectID)
	s.mu.Unlock()
}

// persistentJar 在标准库 jar 之上加一层持久化：
// 域/路径匹配、Secure/HttpOnly 语义仍交给标准库，写入时同步落库。
type persistentJar struct {
	svc       *CookieService
	projectID string
	mem       *cookiejar.Jar
}

func newPersistentJar(svc *CookieService, projectID string) *persistentJar {
	mem, _ := cookiejar.New(nil)
	jar := &persistentJar{svc: svc, projectID: projectID, mem: mem}
	jar.seed()
	return jar
}

// seed 把库里的 Cookie 灌进内存 jar。
func (j *persistentJar) seed() {
	var stored []models.StoredCookie
	if err := j.svc.db.Where("project_id = ?", j.projectID).Find(&stored).Error; err != nil {
		return
	}
	now := time.Now()
	// 按「域 + 路径」分组，构造一个代表性 URL 交给标准库 jar
	grouped := map[string][]*http.Cookie{}
	for _, item := range stored {
		if item.Expired(now) {
			continue
		}
		scheme := "http"
		if item.Secure {
			scheme = "https"
		}
		host := strings.TrimPrefix(item.Domain, ".")
		key := scheme + "://" + host + item.Path
		grouped[key] = append(grouped[key], toHTTPCookie(item))
	}
	for rawURL, cookies := range grouped {
		if u, err := url.Parse(rawURL); err == nil {
			j.mem.SetCookies(u, cookies)
		}
	}
}

// SetCookies 同时更新内存 jar 与数据库。
func (j *persistentJar) SetCookies(u *url.URL, cookies []*http.Cookie) {
	j.mem.SetCookies(u, cookies)

	now := time.Now()
	for _, cookie := range cookies {
		domain := cookie.Domain
		if strings.TrimSpace(domain) == "" {
			domain = u.Hostname()
		}
		path := cookie.Path
		if strings.TrimSpace(path) == "" {
			path = "/"
		}

		// MaxAge<0 或已过期时间表示删除
		expired := cookie.MaxAge < 0 || (!cookie.Expires.IsZero() && cookie.Expires.Before(now))
		if expired {
			j.svc.db.Where("project_id = ? AND domain = ? AND path = ? AND name = ?",
				j.projectID, domain, path, cookie.Name).Delete(&models.StoredCookie{})
			continue
		}

		record := &models.StoredCookie{
			ProjectID: j.projectID,
			Domain:    domain,
			Path:      path,
			Name:      cookie.Name,
			Value:     cookie.Value,
			Secure:    cookie.Secure,
			HTTPOnly:  cookie.HttpOnly,
			SameSite:  sameSiteString(cookie.SameSite),
			Expires:   expiryOf(cookie, now),
		}
		_ = j.svc.saveCookie(record)
	}
}

// Cookies 返回该 URL 应携带的 Cookie（完全交给标准库的匹配规则）。
func (j *persistentJar) Cookies(u *url.URL) []*http.Cookie {
	return j.mem.Cookies(u)
}

// saveCookie 按 (project, domain, path, name) 做 upsert。
func (s *CookieService) saveCookie(record *models.StoredCookie) error {
	err := s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "project_id"}, {Name: "domain"}, {Name: "path"}, {Name: "name"}},
		DoUpdates: clause.AssignmentColumns([]string{"value", "secure", "http_only", "same_site", "expires", "updated_at"}),
	}).Create(record).Error
	if err != nil {
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	return nil
}

// expiryOf 计算 cookie 的绝对过期时间；会话 cookie 返回 nil。
func expiryOf(cookie *http.Cookie, now time.Time) *time.Time {
	if cookie.MaxAge > 0 {
		t := now.Add(time.Duration(cookie.MaxAge) * time.Second)
		return &t
	}
	if !cookie.Expires.IsZero() {
		t := cookie.Expires
		return &t
	}
	return nil
}

// toHTTPCookie 把存储记录还原为标准库 cookie。
func toHTTPCookie(item models.StoredCookie) *http.Cookie {
	cookie := &http.Cookie{
		Name:     item.Name,
		Value:    item.Value,
		Path:     item.Path,
		Domain:   item.Domain,
		Secure:   item.Secure,
		HttpOnly: item.HTTPOnly,
	}
	if item.Expires != nil {
		cookie.Expires = *item.Expires
	}
	switch item.SameSite {
	case "Lax":
		cookie.SameSite = http.SameSiteLaxMode
	case "Strict":
		cookie.SameSite = http.SameSiteStrictMode
	case "None":
		cookie.SameSite = http.SameSiteNoneMode
	default:
		cookie.SameSite = http.SameSiteDefaultMode
	}
	return cookie
}
