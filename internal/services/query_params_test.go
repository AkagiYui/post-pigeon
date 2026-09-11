package services

import (
	"net/url"
	"reflect"
	"testing"

	"PostPigeon/internal/models"
)

func TestQueryParamValues(t *testing.T) {
	tests := []struct {
		name  string
		param models.EndpointParam
		vars  map[string]string
		want  []string
	}{
		{"scalar unchanged", models.EndpointParam{Value: "a,b", DataType: "string"}, nil, []string{"a,b"}},
		{"array expands", models.EndpointParam{Value: `["red","a,b",2,true,null]`, DataType: "array"}, nil, []string{"red", "a,b", "2", "true", ""}},
		{"array variable resolves before parsing", models.EndpointParam{Value: `{{tags}}`, DataType: "array"}, map[string]string{"tags": `["a","b"]`}, []string{"a", "b"}},
		{"invalid legacy array stays scalar", models.EndpointParam{Value: "legacy", DataType: "array"}, nil, []string{"legacy"}},
		{"empty array sends no key", models.EndpointParam{Value: `[]`, DataType: "array"}, nil, []string{}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := queryParamValues(test.param, test.vars); !reflect.DeepEqual(got, test.want) {
				t.Fatalf("queryParamValues() = %#v, want %#v", got, test.want)
			}
		})
	}
}

func TestEndpointParamsFromQueryMergesRepeatedKeys(t *testing.T) {
	params := endpointParamsFromQuery(url.Values{"tag": {"red", "blue"}, "page": {"1"}})
	if len(params) != 2 || params[0].Name != "page" || params[1].Name != "tag" {
		t.Fatalf("params = %+v", params)
	}
	if params[1].DataType != "array" || params[1].Value != `["red","blue"]` {
		t.Fatalf("repeated query was not merged as array: %+v", params[1])
	}
}
