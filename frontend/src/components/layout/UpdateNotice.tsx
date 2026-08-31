import { Icon } from "@iconify-icon/solid"
import { onMount, Show } from "solid-js"

import { Button } from "@/components/ui/button"
import { t } from "@/hooks/useI18n"
import { setSettingsOpen, setSettingsTab } from "@/stores/app"
import { refreshUpdateInfo, updateInfo, updateState } from "@/stores/updater"

/** 全局提示一直保留到更新被跳过或安装，不要求用户先打开设置页。 */
export function UpdateNotice() {
  onMount(() => {
    // 补回 WebView 加载/重载前已完成的后台检查结果。
    void refreshUpdateInfo().catch(err => console.error("同步更新状态失败", err))
  })

  const visible = () => updateState() === "ready"
    || (updateState() === "available" && !!updateInfo()?.available)

  return (
    <Show when={visible()}>
      <div role="status" class="flex shrink-0 items-center justify-between gap-3 border-b border-accent/30 bg-accent-muted px-4 py-1.5 text-sm text-accent">
        <span class="flex items-center gap-2">
          <Icon icon="lucide:download" class="h-4 w-4 shrink-0" />
          {updateState() === "ready"
            ? t("update.ready")
            : t("update.available", { version: updateInfo()?.available?.version ?? "" })}
        </span>
        <Button size="sm" variant="ghost" onClick={() => {
          setSettingsTab("update")
          setSettingsOpen(true)
        }}>
          {t("update.view")}
        </Button>
      </div>
    </Show>
  )
}
