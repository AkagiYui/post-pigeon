package services

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"

	"golang.org/x/net/publicsuffix"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// CookieService 管理项目内的命名 Cookie Jar，以及模块/环境到 Jar 的显式绑定。
// Jar 本身不按请求缓存，确保设置面板和 HTTPService 这两个 Wails 服务实例始终看到同一份数据库状态。
type CookieService struct {
	db *gorm.DB
}

func NewCookieService(db *gorm.DB) *CookieService { return &CookieService{db: db} }

// ListCookieJars 列出项目内的全部命名 Cookie 会话。
func (s *CookieService) ListCookieJars(projectID string) ([]models.CookieJar, error) {
	var list []models.CookieJar
	if err := s.db.Where("project_id = ?", projectID).Order("created_at ASC, name ASC").Find(&list).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeDatabase)
	}
	return list, nil
}

// CreateCookieJar 创建一份可由多个模块选择共享的命名会话。
func (s *CookieService) CreateCookieJar(projectID, name string) (*models.CookieJar, error) {
	name = strings.TrimSpace(name)
	if projectID == "" || name == "" {
		return nil, apperr.New(apperr.CodeInvalidInput, apperr.P("field", "cookieJar"))
	}
	var project models.Project
	if err := s.db.Select("id").Where("id = ?", projectID).First(&project).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeNotFound, apperr.P("id", projectID))
	}
	jar := &models.CookieJar{ProjectID: projectID, Name: name}
	if err := s.db.Create(jar).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeDatabase)
	}
	return jar, nil
}

func (s *CookieService) RenameCookieJar(id, name string) error {
	name = strings.TrimSpace(name)
	if id == "" || name == "" {
		return apperr.New(apperr.CodeInvalidInput, apperr.P("field", "cookieJar"))
	}
	result := s.db.Model(&models.CookieJar{}).Where("id = ?", id).Update("name", name)
	if result.Error != nil {
		return apperr.Wrap(result.Error, apperr.CodeDatabase)
	}
	if result.RowsAffected == 0 {
		return apperr.New(apperr.CodeNotFound, apperr.P("id", id))
	}
	return nil
}

// DeleteCookieJar 仅删除未被模块绑定的会话，避免一次点击让多个模块静默掉登录态。
func (s *CookieService) DeleteCookieJar(id string) error {
	var count int64
	if err := s.db.Model(&models.ModuleCookieBinding{}).Where("cookie_jar_id = ?", id).Count(&count).Error; err != nil {
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	if count > 0 {
		return apperr.New(apperr.CodeInvalidInput, apperr.P("field", "cookieJarInUse"))
	}
	result := s.db.Where("id = ?", id).Delete(&models.CookieJar{})
	if result.Error != nil {
		return apperr.Wrap(result.Error, apperr.CodeDatabase)
	}
	if result.RowsAffected == 0 {
		return apperr.New(apperr.CodeNotFound, apperr.P("id", id))
	}
	return nil
}

// ListModuleCookieBindings 列出项目内所有显式绑定；环境没有记录时继承模块默认绑定。
func (s *CookieService) ListModuleCookieBindings(projectID string) ([]models.ModuleCookieBinding, error) {
	var list []models.ModuleCookieBinding
	err := s.db.Table("module_cookie_bindings AS b").
		Select("b.*").
		Joins("JOIN modules AS m ON m.id = b.module_id").
		Where("m.project_id = ?", projectID).
		Order("m.sort_order ASC, b.environment_id ASC").
		Scan(&list).Error
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeDatabase)
	}
	return list, nil
}

// SetModuleCookieBinding 保存模块默认或单环境覆盖。disabled=true 时 CookieJarID 记为 NULL。
func (s *CookieService) SetModuleCookieBinding(moduleID, environmentID, cookieJarID string, disabled bool) error {
	var module models.Module
	if err := s.db.Select("id", "project_id", "name").Where("id = ?", moduleID).First(&module).Error; err != nil {
		return apperr.Wrap(err, apperr.CodeNotFound, apperr.P("id", moduleID))
	}
	if environmentID != "" {
		var count int64
		if err := s.db.Model(&models.Environment{}).
			Where("id = ? AND project_id = ?", environmentID, module.ProjectID).Count(&count).Error; err != nil {
			return apperr.Wrap(err, apperr.CodeDatabase)
		}
		if count == 0 {
			return apperr.New(apperr.CodeInvalidInput, apperr.P("field", "environmentId"))
		}
	}

	var jarID *string
	if !disabled {
		if cookieJarID == "" {
			return apperr.New(apperr.CodeInvalidInput, apperr.P("field", "cookieJarId"))
		}
		var count int64
		if err := s.db.Model(&models.CookieJar{}).
			Where("id = ? AND project_id = ?", cookieJarID, module.ProjectID).Count(&count).Error; err != nil {
			return apperr.Wrap(err, apperr.CodeDatabase)
		}
		if count == 0 {
			return apperr.New(apperr.CodeInvalidInput, apperr.P("field", "cookieJarId"))
		}
		jarID = &cookieJarID
	}

	binding := &models.ModuleCookieBinding{
		ModuleID:      moduleID,
		EnvironmentID: environmentID,
		CookieJarID:   jarID,
	}
	return s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "module_id"}, {Name: "environment_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"cookie_jar_id", "updated_at"}),
	}).Create(binding).Error
}

// ClearModuleCookieBinding 删除单环境覆盖，使其重新继承模块默认绑定。
func (s *CookieService) ClearModuleCookieBinding(moduleID, environmentID string) error {
	if environmentID == "" {
		return apperr.New(apperr.CodeInvalidInput, apperr.P("field", "environmentId"))
	}
	return s.db.Where("module_id = ? AND environment_id = ?", moduleID, environmentID).
		Delete(&models.ModuleCookieBinding{}).Error
}

// ListCookies 列出一份 Cookie Jar 的全部 Cookie。
func (s *CookieService) ListCookies(cookieJarID string) ([]models.StoredCookie, error) {
	var list []models.StoredCookie
	if err := s.db.Where("cookie_jar_id = ?", cookieJarID).
		Order("domain ASC, path ASC, name ASC").Find(&list).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeDatabase)
	}
	return list, nil
}

func (s *CookieService) UpsertCookie(cookie models.StoredCookie) error {
	if strings.TrimSpace(cookie.CookieJarID) == "" || strings.TrimSpace(cookie.Name) == "" ||
		strings.TrimSpace(cookie.Domain) == "" {
		return apperr.New(apperr.CodeInvalidInput, apperr.P("field", "cookie"))
	}
	if strings.TrimSpace(cookie.Path) == "" {
		cookie.Path = "/"
	}
	var count int64
	if err := s.db.Model(&models.CookieJar{}).Where("id = ?", cookie.CookieJarID).Count(&count).Error; err != nil {
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	if count == 0 {
		return apperr.New(apperr.CodeNotFound, apperr.P("id", cookie.CookieJarID))
	}
	return s.saveCookie(&cookie)
}

func (s *CookieService) DeleteCookie(id string) error {
	result := s.db.Where("id = ?", id).Delete(&models.StoredCookie{})
	if result.Error != nil {
		return apperr.Wrap(result.Error, apperr.CodeDatabase)
	}
	if result.RowsAffected == 0 {
		return apperr.New(apperr.CodeNotFound, apperr.P("id", id))
	}
	return nil
}

func (s *CookieService) ClearCookies(cookieJarID string) error {
	if err := s.db.Where("cookie_jar_id = ?", cookieJarID).Delete(&models.StoredCookie{}).Error; err != nil {
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	return nil
}

func (s *CookieService) PruneExpiredCookies(cookieJarID string) error {
	err := s.db.Where("cookie_jar_id = ? AND expires IS NOT NULL AND expires < ?", cookieJarID, time.Now()).
		Delete(&models.StoredCookie{}).Error
	if err != nil {
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	return nil
}

// jarForRequest 解析「环境覆盖 → 模块默认」绑定，并返回该请求使用的 Jar。
// 禁用绑定或没有模块的临时请求使用一次性 Jar，仍能在自身重定向链中处理 Set-Cookie。
func (s *CookieService) jarForRequest(moduleID, environmentID string) http.CookieJar {
	jarID, enabled, err := s.resolveJarID(moduleID, environmentID)
	if err != nil || !enabled || jarID == "" {
		return newMemoryCookieJar()
	}
	return newPersistentJar(s, jarID)
}

func (s *CookieService) resolveJarID(moduleID, environmentID string) (string, bool, error) {
	if moduleID == "" {
		return "", false, nil
	}
	if environmentID != "" {
		var binding models.ModuleCookieBinding
		err := s.db.Where("module_id = ? AND environment_id = ?", moduleID, environmentID).First(&binding).Error
		if err == nil {
			return bindingJar(binding)
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", false, err
		}
	}

	var binding models.ModuleCookieBinding
	err := s.db.Where("module_id = ? AND environment_id = ''", moduleID).First(&binding).Error
	if err == nil {
		return bindingJar(binding)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", false, err
	}

	// 防御旧数据或外部导入漏建绑定：首次请求时补一个模块私有 Jar。
	var module models.Module
	if err := s.db.Select("id", "project_id", "name").Where("id = ?", moduleID).First(&module).Error; err != nil {
		return "", false, err
	}
	var jarID string
	err = s.db.Transaction(func(tx *gorm.DB) error {
		jar, err := createPrivateCookieJarBinding(tx, module)
		if err != nil {
			return err
		}
		jarID = jar.ID
		return nil
	})
	return jarID, err == nil, err
}

func bindingJar(binding models.ModuleCookieBinding) (string, bool, error) {
	if binding.CookieJarID == nil || *binding.CookieJarID == "" {
		return "", false, nil
	}
	return *binding.CookieJarID, true, nil
}

func createPrivateCookieJarBinding(tx *gorm.DB, module models.Module) (*models.CookieJar, error) {
	jar := &models.CookieJar{ProjectID: module.ProjectID, Name: fmt.Sprintf("%s（私有）", module.Name)}
	if err := tx.Create(jar).Error; err != nil {
		return nil, err
	}
	jarID := jar.ID
	binding := &models.ModuleCookieBinding{ModuleID: module.ID, EnvironmentID: "", CookieJarID: &jarID}
	if err := tx.Create(binding).Error; err != nil {
		return nil, err
	}
	return jar, nil
}

type persistentJar struct {
	svc   *CookieService
	jarID string
	mem   *cookiejar.Jar
}

func newMemoryCookieJar() *cookiejar.Jar {
	jar, _ := cookiejar.New(&cookiejar.Options{PublicSuffixList: publicsuffix.List})
	return jar
}

func newPersistentJar(svc *CookieService, jarID string) *persistentJar {
	jar := &persistentJar{svc: svc, jarID: jarID, mem: newMemoryCookieJar()}
	jar.seed()
	return jar
}

func (j *persistentJar) seed() {
	var stored []models.StoredCookie
	if err := j.svc.db.Where("cookie_jar_id = ?", j.jarID).Find(&stored).Error; err != nil {
		return
	}
	now := time.Now()
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

func (j *persistentJar) SetCookies(u *url.URL, cookies []*http.Cookie) {
	j.mem.SetCookies(u, cookies)
	now := time.Now()
	for _, cookie := range cookies {
		domain := cookie.Domain
		hostOnly := strings.TrimSpace(domain) == ""
		if hostOnly {
			domain = u.Hostname()
		}
		path := cookie.Path
		if strings.TrimSpace(path) == "" {
			path = defaultCookiePath(u.Path)
		}
		expired := cookie.MaxAge < 0 || (!cookie.Expires.IsZero() && cookie.Expires.Before(now))
		if expired {
			j.svc.db.Where("cookie_jar_id = ? AND domain = ? AND path = ? AND name = ?",
				j.jarID, domain, path, cookie.Name).Delete(&models.StoredCookie{})
			continue
		}
		record := &models.StoredCookie{
			CookieJarID: j.jarID,
			Domain:      domain,
			Path:        path,
			Name:        cookie.Name,
			Value:       cookie.Value,
			Secure:      cookie.Secure,
			HTTPOnly:    cookie.HttpOnly,
			HostOnly:    hostOnly,
			SameSite:    sameSiteString(cookie.SameSite),
			Expires:     expiryOf(cookie, now),
		}
		_ = j.svc.saveCookie(record)
	}
}

func (j *persistentJar) Cookies(u *url.URL) []*http.Cookie { return j.mem.Cookies(u) }

func (s *CookieService) saveCookie(record *models.StoredCookie) error {
	err := s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "cookie_jar_id"}, {Name: "domain"}, {Name: "path"}, {Name: "name"}},
		DoUpdates: clause.AssignmentColumns([]string{"value", "secure", "http_only", "host_only", "same_site", "expires", "updated_at"}),
	}).Create(record).Error
	if err != nil {
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	return nil
}

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

// defaultCookiePath 实现 RFC 6265 的默认路径：响应没有 Path 属性时，沿用请求 URL 的目录。
func defaultCookiePath(requestPath string) string {
	if requestPath == "" || requestPath[0] != '/' {
		return "/"
	}
	lastSlash := strings.LastIndex(requestPath, "/")
	if lastSlash <= 0 {
		return "/"
	}
	return requestPath[:lastSlash]
}

func toHTTPCookie(item models.StoredCookie) *http.Cookie {
	domain := item.Domain
	if item.HostOnly {
		domain = ""
	}
	cookie := &http.Cookie{
		Name:     item.Name,
		Value:    item.Value,
		Path:     item.Path,
		Domain:   domain,
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
