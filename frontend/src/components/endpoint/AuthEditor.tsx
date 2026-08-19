// 认证信息编辑器（受控组件）
import { Show } from "solid-js"

import type { AuthState } from "@/components/endpoint/EndpointDetail"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { type AuthType } from "@/lib/types"

const authTypeOptions = () => [
  { value: "inherit", label: t("endpoint.auth.inherit") },
  { value: "none", label: t("endpoint.auth.none") },
  { value: "basic", label: t("endpoint.auth.basic") },
  { value: "bearer", label: t("endpoint.auth.bearer") },
  { value: "digest", label: t("endpoint.auth.digest") },
  { value: "apikey", label: "API Key" },
  { value: "oauth2", label: "OAuth 2.0" },
]

const oauthGrantOptions = () => [
  { value: "client_credentials", label: t("endpoint.auth.oauth.clientCredentials") },
  { value: "password", label: t("endpoint.auth.oauth.password") },
]

const oauthClientAuthOptions = () => [
  { value: "body", label: t("endpoint.auth.oauth.inBody") },
  { value: "basic", label: t("endpoint.auth.oauth.inHeader") },
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
          options={authTypeOptions()}
          value={props.value.type}
          onChange={(v) => patch({ type: v as AuthType })}
          class="w-48"
        />
      </div>

      {/* basic 与 digest 的凭据形态一致，共用同一组输入 */}
      <Show when={props.value.type === "basic" || props.value.type === "digest"}>
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

      <Show when={props.value.type === "digest"}>
        <p class="text-sm text-muted-foreground">{t("endpoint.auth.digestHint")}</p>
      </Show>

      <Show when={props.value.type === "oauth2"}>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">{t("endpoint.auth.oauth.grantType")}</label>
            <Select
              options={oauthGrantOptions()}
              value={props.value.oauthGrantType}
              onChange={(v) => patch({ oauthGrantType: v })}
              class="w-56"
            />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">{t("endpoint.auth.oauth.tokenUrl")}</label>
            <Input value={props.value.oauthTokenUrl} onInput={(e) => patch({ oauthTokenUrl: e.currentTarget.value })} placeholder="https://auth.example.com/oauth/token" class="flex-1" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">Client ID</label>
            <Input value={props.value.oauthClientId} onInput={(e) => patch({ oauthClientId: e.currentTarget.value })} class="flex-1" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">Client Secret</label>
            <Input type="password" value={props.value.oauthClientSecret} onInput={(e) => patch({ oauthClientSecret: e.currentTarget.value })} class="flex-1" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">Scope</label>
            <Input value={props.value.oauthScope} onInput={(e) => patch({ oauthScope: e.currentTarget.value })} placeholder="read write" class="flex-1" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm w-20 shrink-0">{t("endpoint.auth.oauth.clientAuth")}</label>
            <Select
              options={oauthClientAuthOptions()}
              value={props.value.oauthClientAuth}
              onChange={(v) => patch({ oauthClientAuth: v })}
              class="w-56"
            />
          </div>
          {/* password 授权额外需要用户名/密码，与 basic 复用同一组字段 */}
          <Show when={props.value.oauthGrantType === "password"}>
            <div class="flex items-center gap-3">
              <label class="text-sm w-20 shrink-0">{t("endpoint.auth.username")}</label>
              <Input value={props.value.username} onInput={(e) => patch({ username: e.currentTarget.value })} class="flex-1" />
            </div>
            <div class="flex items-center gap-3">
              <label class="text-sm w-20 shrink-0">{t("endpoint.auth.password")}</label>
              <Input type="password" value={props.value.password} onInput={(e) => patch({ password: e.currentTarget.value })} class="flex-1" />
            </div>
          </Show>
          <p class="text-xs text-muted-foreground">{t("endpoint.auth.oauth.hint")}</p>
        </div>
      </Show>

      <Show when={props.value.type === "inherit"}>
        <p class="text-sm text-muted-foreground">{t("endpoint.auth.inheritHint")}</p>
      </Show>
    </div>
  )
}
