// TLS / 证书设置面板：全局级与项目级共用。
//
// 调试内网自签证书、或调用需要双向认证的接口时，必须能改动证书校验行为。
// 层级与代理一致：接口(inherit/strict/insecure) → 项目(可跟随全局) → 全局。
// 证书材料只在项目与全局配置，接口级只做「跟随 / 强制校验 / 跳过校验」的选择，
// 免得同一份证书在几十个接口上重复粘贴。
import { createEffect, createSignal, on, Show } from "solid-js"

import { ScopeTLSSettings } from "@/../bindings/PostPigeon/internal/models"
import { TLSService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { toastError, toastSuccess } from "@/stores/toast"

export interface TLSSettingsPanelProps {
  /** 作用域：全局或项目 */
  scope: "global" | "project"
  /** 项目 ID（scope=project 时必填） */
  projectId?: string | null
}

export function TLSSettingsPanel(props: TLSSettingsPanelProps) {
  const isProject = () => props.scope === "project"

  const [followGlobal, setFollowGlobal] = createSignal(true)
  const [insecure, setInsecure] = createSignal(false)
  const [caCert, setCaCert] = createSignal("")
  const [clientCert, setClientCert] = createSignal("")
  const [clientKey, setClientKey] = createSignal("")
  const [minVersion, setMinVersion] = createSignal("")
  const [saving, setSaving] = createSignal(false)

  /** 编辑区在「项目跟随全局」时禁用 */
  const editDisabled = () => isProject() && followGlobal()

  const minVersionOptions = () => [
    { value: "", label: t("tls.minVersion.default") },
    { value: "1.0", label: "TLS 1.0" },
    { value: "1.1", label: "TLS 1.1" },
    { value: "1.2", label: "TLS 1.2" },
    { value: "1.3", label: "TLS 1.3" },
  ]

  const load = async () => {
    try {
      const s = props.scope === "global"
        ? await TLSService.GetGlobalTLSSettings()
        : props.projectId
          ? await TLSService.GetProjectTLSSettings(props.projectId)
          : null
      if (!s) return
      setFollowGlobal(isProject() ? !!s.followGlobal : false)
      setInsecure(!!s.insecureSkipVerify)
      setCaCert(s.caCert || "")
      setClientCert(s.clientCert || "")
      setClientKey(s.clientKey || "")
      setMinVersion(s.minVersion || "")
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  createEffect(on(() => props.projectId, () => { load() }))

  const save = async () => {
    setSaving(true)
    try {
      const settings = new ScopeTLSSettings({
        followGlobal: isProject() ? followGlobal() : false,
        insecureSkipVerify: insecure(),
        caCert: caCert().trim(),
        clientCert: clientCert().trim(),
        clientKey: clientKey().trim(),
        minVersion: minVersion(),
      })
      if (props.scope === "global") {
        await TLSService.SaveGlobalTLSSettings(settings)
      } else if (props.projectId) {
        await TLSService.SaveProjectTLSSettings(props.projectId, settings)
      }
      toastSuccess(t("common.saved"))
      await load()
    } catch (e) {
      toastError(e, "error.op.saveFailed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div class="flex h-full flex-col gap-4">
      <div>
        <h2 class="text-base font-medium">{t("tls.title")}</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {isProject() ? t("tls.project.hint") : t("tls.global.hint")}
        </p>
      </div>

      <Show when={isProject()}>
        <label class="flex cursor-pointer select-none items-center gap-2 text-sm">
          <Checkbox checked={followGlobal()} onChange={(e) => setFollowGlobal(e.currentTarget.checked)} />
          <span class="font-medium">{t("tls.followGlobal")}</span>
        </label>
      </Show>

      <div class={cn("min-h-0 flex-1 space-y-4 overflow-auto pr-1", editDisabled() && "pointer-events-none opacity-50")}>
        {/* 跳过证书校验 */}
        <div class="space-y-1.5">
          <label class="flex cursor-pointer select-none items-center gap-2 text-sm">
            <Checkbox checked={insecure()} onChange={(e) => setInsecure(e.currentTarget.checked)} />
            <span class="font-medium">{t("tls.insecure")}</span>
          </label>
          <p class="pl-6 text-xs text-muted-foreground">{t("tls.insecure.hint")}</p>
        </div>

        {/* 最低 TLS 版本 */}
        <div class="space-y-1.5">
          <label class="text-sm font-medium">{t("tls.minVersion")}</label>
          <Select options={minVersionOptions()} value={minVersion()} onChange={setMinVersion} size="sm" class="w-48" />
        </div>

        {/* 自定义 CA */}
        <div class="space-y-1.5">
          <label class="text-sm font-medium">{t("tls.caCert")}</label>
          <p class="text-xs text-muted-foreground">{t("tls.caCert.hint")}</p>
          <Textarea
            value={caCert()}
            onInput={(e) => setCaCert(e.currentTarget.value)}
            rows={5}
            spellcheck={false}
            placeholder={"-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----"}
            class="font-mono text-xs"
          />
        </div>

        {/* 客户端证书（双向 TLS） */}
        <div class="space-y-1.5">
          <label class="text-sm font-medium">{t("tls.clientCert")}</label>
          <p class="text-xs text-muted-foreground">{t("tls.clientCert.hint")}</p>
          <Textarea
            value={clientCert()}
            onInput={(e) => setClientCert(e.currentTarget.value)}
            rows={4}
            spellcheck={false}
            placeholder={"-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----"}
            class="font-mono text-xs"
          />
          <Textarea
            value={clientKey()}
            onInput={(e) => setClientKey(e.currentTarget.value)}
            rows={4}
            spellcheck={false}
            placeholder={"-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----"}
            class="font-mono text-xs"
          />
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2 border-t border-border pt-3">
        <Button size="sm" onClick={save} disabled={saving()}>
          {saving() ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  )
}
