// 设置模态框组件
import { Icon } from "@iconify-icon/solid"
import { createSignal } from "solid-js"

import { Dialog } from "@/components/ui/dialog"
import { SideTabs } from "@/components/ui/tabs"
import { t } from "@/hooks/useI18n"

import { AboutSettings } from "./AboutSettings"
import { AppearanceSettings } from "./AppearanceSettings"
import { LanguageSettings } from "./LanguageSettings"
import { ProxySettingsPanel } from "./ProxySettingsPanel"

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

/** 设置标签列表 */
const settingsTabs = [
  { key: "appearance", label: "", icon: <Icon icon="lucide:palette" class="h-4 w-4" /> }, // label 在渲染时由 i18n 填充
  { key: "language", label: "", icon: <Icon icon="lucide:globe" class="h-4 w-4" /> },
  { key: "proxy", label: "", icon: <Icon icon="lucide:network" class="h-4 w-4" /> },
  { key: "about", label: "", icon: <Icon icon="lucide:info" class="h-4 w-4" /> },
]

/**
 * SettingsModal 设置模态框
 */
export function SettingsModal(props: SettingsModalProps) {
  const [activeTab, setActiveTab] = createSignal("appearance")

  // 带国际化标签的 tab 列表
  const tabs = () => settingsTabs.map(tab => ({
    ...tab,
    label: t(`settings.${tab.key}`),
  }))

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t("settings.title")}
      width="840px"
      height="85vh"
      closeOnEsc
      closeOnOverlayClick
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
            case "proxy": return <ProxySettingsPanel scope="global" />
            case "about": return <AboutSettings />
            default: return null
          }
        }}
      </SideTabs>
    </Dialog>
  )
}
