package services

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

func TestBuildGraphQLBody(t *testing.T) {
	stored := models.ToJSON(models.GraphQLBody{
		Query:         "query Q($id: ID!) { user(id: $id) { name } }",
		Variables:     `{"id":"1"}`,
		OperationName: "Q",
	})

	payload, err := buildGraphQLBody(stored)
	if err != nil {
		t.Fatalf("buildGraphQLBody err=%v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("生成的请求体不是合法 JSON: %v", err)
	}
	if !strings.Contains(decoded["query"].(string), "user(id: $id)") {
		t.Errorf("query=%v", decoded["query"])
	}
	if decoded["operationName"] != "Q" {
		t.Errorf("operationName=%v", decoded["operationName"])
	}
	// 变量必须作为对象嵌入，而不是一段字符串
	variables, ok := decoded["variables"].(map[string]any)
	if !ok || variables["id"] != "1" {
		t.Fatalf("variables=%#v", decoded["variables"])
	}
}

func TestBuildGraphQLBodyWithoutVariables(t *testing.T) {
	payload, err := buildGraphQLBody(models.ToJSON(models.GraphQLBody{Query: "{ ping }"}))
	if err != nil {
		t.Fatalf("buildGraphQLBody err=%v", err)
	}
	var decoded map[string]any
	_ = json.Unmarshal(payload, &decoded)
	if _, exists := decoded["variables"]; exists {
		t.Errorf("没有变量时不应写入 variables 字段：%s", payload)
	}
	if _, exists := decoded["operationName"]; exists {
		t.Errorf("没有 operationName 时不应写入该字段：%s", payload)
	}
}

func TestBuildGraphQLBodyToleratesBadVariables(t *testing.T) {
	// 变量写错不应拦下整条请求：查询本身通常仍然有效
	payload, err := buildGraphQLBody(models.ToJSON(models.GraphQLBody{Query: "{ ping }", Variables: "{oops"}))
	if err != nil {
		t.Fatalf("buildGraphQLBody err=%v", err)
	}
	var decoded map[string]any
	_ = json.Unmarshal(payload, &decoded)
	if _, exists := decoded["variables"]; exists {
		t.Errorf("非法变量应被忽略：%s", payload)
	}
}

func TestBuildGraphQLBodyRejectsBadStorage(t *testing.T) {
	if _, err := buildGraphQLBody("{oops"); err == nil {
		t.Errorf("存储形态非法时应报错")
	}
}

// TestSendGraphQLRequest 端到端验证 GraphQL 请求体的实际发送形态。
func TestSendGraphQLRequest(t *testing.T) {
	db := newTestDB(t)

	var received map[string]any
	var contentType string
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		contentType = r.Header.Get("Content-Type")
		_ = json.NewDecoder(r.Body).Decode(&received)
		_, _ = w.Write([]byte(`{"data":{"ok":true}}`))
	}))

	hs := newTestHTTPService(t, db)
	if _, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/graphql",
		BodyType: string(models.BodyTypeGraphQL),
		BodyContent: models.ToJSON(models.GraphQLBody{
			Query: "{ ok }", Variables: `{"flag":true}`,
		}),
	}); err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}

	if !strings.Contains(contentType, "application/json") {
		t.Errorf("Content-Type=%q", contentType)
	}
	if received["query"] != "{ ok }" {
		t.Errorf("query=%v", received["query"])
	}
	if vars, ok := received["variables"].(map[string]any); !ok || vars["flag"] != true {
		t.Errorf("variables=%#v", received["variables"])
	}
}
