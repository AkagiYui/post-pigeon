package scripting

// VarStore 是脚本可读写的变量存储（环境 / 全局 / 集合作用域各一份）。
// 它记录被修改和删除的键，便于请求结束后仅将增量持久化回数据库。
type VarStore struct {
	values  map[string]string
	dirty   map[string]struct{} // 被 Set 过的键
	removed map[string]struct{} // 被 Unset 过的键
}

// NewVarStore 用初始键值创建变量存储，initial 可以为 nil。
func NewVarStore(initial map[string]string) *VarStore {
	values := make(map[string]string, len(initial))
	for k, v := range initial {
		values[k] = v
	}
	return &VarStore{
		values:  values,
		dirty:   make(map[string]struct{}),
		removed: make(map[string]struct{}),
	}
}

// Get 返回变量值及是否存在。
func (s *VarStore) Get(key string) (string, bool) {
	v, ok := s.values[key]
	return v, ok
}

// Has 判断变量是否存在。
func (s *VarStore) Has(key string) bool {
	_, ok := s.values[key]
	return ok
}

// Set 设置变量值并标记为脏。
func (s *VarStore) Set(key, value string) {
	s.values[key] = value
	s.dirty[key] = struct{}{}
	delete(s.removed, key)
}

// Unset 删除变量并记录为待删除。
func (s *VarStore) Unset(key string) {
	if _, existed := s.values[key]; existed {
		s.removed[key] = struct{}{}
	}
	delete(s.values, key)
	delete(s.dirty, key)
}

// Clear 清空所有变量，并把原有键记录为待删除。
func (s *VarStore) Clear() {
	for k := range s.values {
		s.removed[k] = struct{}{}
	}
	s.values = make(map[string]string)
	s.dirty = make(map[string]struct{})
}

// ToMap 返回当前变量的浅拷贝。
func (s *VarStore) ToMap() map[string]string {
	out := make(map[string]string, len(s.values))
	for k, v := range s.values {
		out[k] = v
	}
	return out
}

// Changes 返回需要持久化的增量：upserts 为新增/修改的键值，removed 为需删除的键。
func (s *VarStore) Changes() (upserts map[string]string, removed []string) {
	upserts = make(map[string]string, len(s.dirty))
	for k := range s.dirty {
		if v, ok := s.values[k]; ok {
			upserts[k] = v
		}
	}
	for k := range s.removed {
		removed = append(removed, k)
	}
	return upserts, removed
}

// Header 表示一个请求或响应头。脚本以有序列表方式操作它们。
type Header struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}
