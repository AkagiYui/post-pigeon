package apperr

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestErrorEncodesJSON(t *testing.T) {
	err := New(CodeNotFound, P("name", "订单接口"))

	var decoded Error
	if jsonErr := json.Unmarshal([]byte(err.Error()), &decoded); jsonErr != nil {
		t.Fatalf("Error() 应为合法 JSON，实际 %q（%v）", err.Error(), jsonErr)
	}
	if decoded.Kind != Marker {
		t.Errorf("应带 $kind 标记，实际 %q", decoded.Kind)
	}
	if decoded.Code != CodeNotFound {
		t.Errorf("Code=%q", decoded.Code)
	}
	if decoded.Params["name"] != "订单接口" {
		t.Errorf("Params=%v", decoded.Params)
	}
}

func TestWrapPreservesCause(t *testing.T) {
	cause := errors.New("connection refused")
	err := Wrap(cause, CodeSendRequest)

	if !errors.Is(err, cause) {
		t.Errorf("应能通过 errors.Is 找回原始错误")
	}
	if Code(err) != CodeSendRequest {
		t.Errorf("Code=%q", Code(err))
	}

	var decoded Error
	_ = json.Unmarshal([]byte(err.Error()), &decoded)
	if decoded.Cause != "connection refused" {
		t.Errorf("应保留原始错误文本，实际 %q", decoded.Cause)
	}
}

func TestWrapNilReturnsNil(t *testing.T) {
	if err := Wrap(nil, CodeSendRequest); err != nil {
		t.Errorf("包装 nil 应返回 nil，实际 %v", err)
	}
}

func TestWrapKeepsInnermostCode(t *testing.T) {
	inner := New(CodeTLSConfigInvalid)
	outer := Wrap(inner, CodeSendRequest)
	if Code(outer) != CodeTLSConfigInvalid {
		t.Errorf("重复包装应保留最内层错误码，实际 %q", Code(outer))
	}
}

func TestCodeOfPlainError(t *testing.T) {
	if got := Code(errors.New("boom")); got != "" {
		t.Errorf("普通错误应返回空错误码，实际 %q", got)
	}
	if got := Code(nil); got != "" {
		t.Errorf("nil 应返回空错误码，实际 %q", got)
	}
}
