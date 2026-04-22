// 设置模态框组件
import { createSignal } from "solid-js"

import { Dialog } from "@/components/ui/dialog"
import { SideTabs } from "@/components/ui/tabs"
import { t } from "@/hooks/useI18n"

import { AboutSettings } from "./AboutSettings"
import { AppearanceSettings } from "./AppearanceSettings"
import { LanguageSettings } from "./LanguageSettings"

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

/** 设置标签列表 */
const settingsTabs = [
  { key: "appearance", label: "" }, // label 在渲染时由 i18n 填充
  { key: "language", label: "" },
  { key: "about", label: "" },
]

/**
 * SettingsModal 设置模态框
 */
export function SettingsModal(props: SettingsModalProps) {
  const [activeTab, setActiveTab] = createSignal("appearance")

  // 带国际化标签的 tab 列表
  const tabs = () => settingsTabs.map(tab => ({
    ...tab,
    label: t(`settings.${tab.key === "appearance" ? "appearance" : tab.key === "language" ? "language" : "about"}`),
  }))

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t("settings.title")}
      width="640px"
    >
      <SideTabs
        tabs={tabs()}
        value={activeTab()}
        onChange={setActiveTab}
      >
        {(key) => {
          switch (key) {
            case "appearance": return <AppearanceSettings />
            case "language": return <LanguageSettings />
            case "about": return <AboutSettings />
            default: return null
          }
        }}
      </SideTabs>
    </Dialog>
  )
}
