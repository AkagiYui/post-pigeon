package services

import (
	"bytes"
	"encoding/json"
	"sort"
	"strconv"
	"strings"

	"PostPigeon/internal/models"
)

type serializedBodyField struct {
	Name  string
	Value string
}

func bodyFieldDataType(field models.EndpointBodyField) string {
	if field.DataType != "" {
		return field.DataType
	}
	if field.FieldType == "file" {
		return "file"
	}
	return "string"
}

func bodyFieldExplodes(field models.EndpointBodyField) bool {
	return field.Explode == nil || *field.Explode
}

// serializeFormBodyField 将 OpenAPI/Apifox 的 array/object 参数展开成实际表单键值。
// 非法 JSON 保留原始文本，避免仅因类型标注错误就静默丢掉用户输入。
func serializeFormBodyField(field models.EndpointBodyField, vars map[string]string) []serializedBodyField {
	value := resolveVars(field.Value, vars)
	switch bodyFieldDataType(field) {
	case "array":
		var items []any
		decoder := json.NewDecoder(bytes.NewBufferString(value))
		decoder.UseNumber()
		if decoder.Decode(&items) != nil {
			return []serializedBodyField{{Name: field.Name, Value: value}}
		}
		values := make([]string, 0, len(items))
		for _, item := range items {
			values = append(values, formScalar(item))
		}
		if bodyFieldExplodes(field) {
			out := make([]serializedBodyField, 0, len(values))
			for _, item := range values {
				out = append(out, serializedBodyField{Name: field.Name, Value: item})
			}
			return out
		}
		delimiter := ","
		if field.Style == "spaceDelimited" {
			delimiter = " "
		} else if field.Style == "pipeDelimited" {
			delimiter = "|"
		}
		return []serializedBodyField{{Name: field.Name, Value: strings.Join(values, delimiter)}}

	case "object":
		var object map[string]any
		decoder := json.NewDecoder(bytes.NewBufferString(value))
		decoder.UseNumber()
		if decoder.Decode(&object) != nil {
			return []serializedBodyField{{Name: field.Name, Value: value}}
		}
		keys := make([]string, 0, len(object))
		for key := range object {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		if field.Style == "deepObject" {
			out := make([]serializedBodyField, 0, len(keys))
			for _, key := range keys {
				out = append(out, serializedBodyField{Name: field.Name + "[" + key + "]", Value: formScalar(object[key])})
			}
			return out
		}
		if bodyFieldExplodes(field) {
			out := make([]serializedBodyField, 0, len(keys))
			for _, key := range keys {
				out = append(out, serializedBodyField{Name: key, Value: formScalar(object[key])})
			}
			return out
		}
		flat := make([]string, 0, len(keys)*2)
		for _, key := range keys {
			flat = append(flat, key, formScalar(object[key]))
		}
		return []serializedBodyField{{Name: field.Name, Value: strings.Join(flat, ",")}}
	default:
		return []serializedBodyField{{Name: field.Name, Value: value}}
	}
}

func serializeURLEncodedBodyField(field models.EndpointBodyField, vars map[string]string) []serializedBodyField {
	if bodyFieldDataType(field) != "file" {
		return serializeFormBodyField(field, vars)
	}
	value := field.Value
	if files, ok := parseFileFields(field.Value); ok {
		names := make([]string, 0, len(files))
		for _, file := range files {
			names = append(names, file.displayName())
		}
		value = strings.Join(names, ", ")
	}
	return []serializedBodyField{{Name: field.Name, Value: resolveVars(value, vars)}}
}

func formScalar(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case bool:
		return strconv.FormatBool(typed)
	case json.Number:
		return typed.String()
	default:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return ""
		}
		return string(encoded)
	}
}
