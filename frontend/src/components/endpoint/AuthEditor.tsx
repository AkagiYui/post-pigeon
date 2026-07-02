// 认证信息编辑器（受控组件）
import { Show } from "solid-js"

import type { AuthState } from "@/components/endpoint/EndpointDetail"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { type AuthType } from "@/lib/types"

const authTypeOptions = [
  { value: "inherit", label: t("endpoint.auth.inherit") },
  { value: "none", label: t("endpoint.auth.none") },
  { value: "basic", label: t("endpoint.auth.basic") },
  { value: "bearer", label: t("endpoint.auth.bearer") },
  { value: "apikey", label: "API Key" },
]

const apiKeyInOptions = [
  { value: "header", label: "Header" },
  { value: "query", label: "Query" },
  { value: "cookie", label: "Cookie" },
]

export interface AuthEditorProps {
  value: AuthState
  onChange: (value: AuthState) => void
}

export function AuthEditor(props: AuthEditorProps) {
  const patch = (p: Partial<AuthState>) => props.onChange({ ...props.value, ...p })

  return (
    <div class="p-3 space-y-4">
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-20 shrink-0">{t("common.type")}</label>
        <Select
          options={authTypeOptions}
          value={props.value.type}
          onChange={(v) => patch({ type: v as AuthType })}
          class="w-48"
        />
      </div>

      <Show when={props.value.type === "basic"}>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">{t("endpoint.auth.username")}</label>
            <Input value={props.value.username} onInput={(e) => patch({ username: e.currentTarget.value })} class="flex-1" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">{t("endpoint.auth.password")}</label>
            <Input type="password" value={props.value.password} onInput={(e) => patch({ password: e.currentTarget.value })} class="flex-1" />
          </div>
        </div>
      </Show>

      <Show when={props.value.type === "bearer"}>
        <div class="flex items-center gap-3">
          <label class="text-sm w-20 shrink-0">{t("endpoint.auth.token")}</label>
          <Input value={props.value.token} onInput={(e) => patch({ token: e.currentTarget.value })} placeholder={t("common.bearerToken")} class="flex-1" />
        </div>
      </Show>

      <Show when={props.value.type === "apikey"}>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">{t("endpoint.auth.apiKeyName")}</label>
            <Input value={props.value.apiKeyKey} onInput={(e) => patch({ apiKeyKey: e.currentTarget.value })} placeholder="Authorization" class="flex-1" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">{t("endpoint.param.value")}</label>
            <Input value={props.value.apiKeyValue} onInput={(e) => patch({ apiKeyValue: e.currentTarget.value })} class="flex-1" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">{t("endpoint.auth.apiKeyIn")}</label>
            <Select options={apiKeyInOptions} value={props.value.apiKeyIn} onChange={(v) => patch({ apiKeyIn: v })} class="w-48" />
          </div>
        </div>
      </Show>

      <Show when={props.value.type === "inherit"}>
        <p class="text-sm text-muted-foreground">{t("endpoint.auth.inheritHint")}</p>
      </Show>
    </div>
  )
}
