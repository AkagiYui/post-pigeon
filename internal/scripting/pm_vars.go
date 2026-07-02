package scripting

import (
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

// buildVarScopes 安装 pm.environment / globals / collectionVariables / moduleVariables /
// iterationData / variables。
func buildVarScopes(vm *goja.Runtime, pm *goja.Object, stores Stores) {
	envScope := newVarScope(vm, stores.Environment, false)
	envScope.Set("name", stores.EnvName)
	pm.Set("environment", envScope)
	pm.Set("globals", newVarScope(vm, stores.Globals, false))
	collection := newVarScope(vm, stores.Collection, false)
	pm.Set("collectionVariables", collection)
	pm.Set("moduleVariables", collection) // Apifox 别名
	pm.Set("iterationData", newVarScope(vm, stores.Data, true))

	// pm.variables：跨作用域解析器，优先级 local > data > environment > collection > global。
	order := []*VarStore{stores.Local, stores.Data, stores.Environment, stores.Collection, stores.Globals}
	lookup := func(key string) (string, bool) {
		for _, s := range order {
			if s != nil {
				if v, ok := s.Get(key); ok {
					return v, true
				}
			}
		}
		return "", false
	}
	vars := vm.NewObject()
	vars.Set("get", func(call goja.FunctionCall) goja.Value {
		if v, ok := lookup(call.Argument(0).String()); ok {
			return vm.ToValue(v)
		}
		return goja.Undefined()
	})
	vars.Set("has", func(call goja.FunctionCall) goja.Value {
		_, ok := lookup(call.Argument(0).String())
		return vm.ToValue(ok)
	})
	vars.Set("set", func(call goja.FunctionCall) goja.Value {
		if stores.Local != nil {
			stores.Local.Set(call.Argument(0).String(), valueToString(call.Argument(1)))
		}
		return goja.Undefined()
	})
	vars.Set("replaceIn", func(call goja.FunctionCall) goja.Value {
		return vm.ToValue(resolvePlaceholders(call.Argument(0).String(), mergedVars(order)))
	})
	vars.Set("replaceInAsync", func(call goja.FunctionCall) goja.Value {
		return resolvedPromise(vm, resolvePlaceholders(call.Argument(0).String(), mergedVars(order)))
	})
	vars.Set("toObject", func(goja.FunctionCall) goja.Value { return vm.ToValue(mergedVars(order)) })
	pm.Set("variables", vars)
}

// newVarScope 构建一个绑定到 VarStore 的作用域对象。readonly 为 true 时仅保留只读方法（iterationData）。
func newVarScope(vm *goja.Runtime, store *VarStore, readonly bool) *goja.Object {
	o := vm.NewObject()
	o.Set("get", func(call goja.FunctionCall) goja.Value {
		if store != nil {
			if v, ok := store.Get(call.Argument(0).String()); ok {
				return vm.ToValue(v)
			}
		}
		return goja.Undefined()
	})
	o.Set("has", func(call goja.FunctionCall) goja.Value {
		return vm.ToValue(store != nil && store.Has(call.Argument(0).String()))
	})
	o.Set("toObject", func(goja.FunctionCall) goja.Value {
		if store == nil {
			return vm.ToValue(map[string]string{})
		}
		return vm.ToValue(store.ToMap())
	})
	o.Set("replaceIn", func(call goja.FunctionCall) goja.Value {
		m := map[string]string{}
		if store != nil {
			m = store.ToMap()
		}
		return vm.ToValue(resolvePlaceholders(call.Argument(0).String(), m))
	})
	o.Set("replaceInAsync", func(call goja.FunctionCall) goja.Value {
		m := map[string]string{}
		if store != nil {
			m = store.ToMap()
		}
		return resolvedPromise(vm, resolvePlaceholders(call.Argument(0).String(), m))
	})
	if !readonly {
		o.Set("set", func(call goja.FunctionCall) goja.Value {
			if store != nil {
				store.Set(call.Argument(0).String(), valueToString(call.Argument(1)))
			}
			return goja.Undefined()
		})
		o.Set("unset", func(call goja.FunctionCall) goja.Value {
			if store != nil {
				store.Unset(call.Argument(0).String())
			}
			return goja.Undefined()
		})
		o.Set("clear", func(goja.FunctionCall) goja.Value {
			if store != nil {
				store.Clear()
			}
			return goja.Undefined()
		})
	}
	return o
}

// mergedVars 按给定优先级（低→高覆盖顺序需反转）合并各作用域为一个 map。
func mergedVars(order []*VarStore) map[string]string {
	merged := map[string]string{}
	// order 是 高→低 优先级；合并时从低到高覆盖，故逆序遍历
	for i := len(order) - 1; i >= 0; i-- {
		if order[i] != nil {
			for k, v := range order[i].ToMap() {
				merged[k] = v
			}
		}
	}
	return merged
}

// resolvedPromise 返回一个立即 resolve 为 val 的 Promise。
func resolvedPromise(vm *goja.Runtime, val string) goja.Value {
	p, resolve, _ := vm.NewPromise()
	resolve(vm.ToValue(val))
	return vm.ToValue(p)
}

// valueToString 将 JS 值转为存储用字符串（对象序列化为 JSON）。
func valueToString(v goja.Value) string {
	if v == nil || goja.IsUndefined(v) || goja.IsNull(v) {
		return ""
	}
	return v.String()
}

// resolvePlaceholders 替换字符串中的 {{key}} 占位符（多趟以支持一层嵌套）。
func resolvePlaceholders(input string, vars map[string]string) string {
	result := input
	for i := 0; i < 5 && strings.Contains(result, "{{"); i++ {
		prev := result
		for k, v := range vars {
			result = strings.ReplaceAll(result, fmt.Sprintf("{{%s}}", k), v)
		}
		if result == prev {
			break
		}
	}
	return result
}
