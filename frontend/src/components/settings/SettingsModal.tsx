// 设置模态框组件
import { Icon } from "@iconify-icon/solid"
import { createSignal } from "solid-js"

import { Dialog } from "@/components/ui/dialog"
import { SideTabs } from "@/components/ui/tabs"
import { t } from "@/hooks/useI18n"

import { AboutSettings } from "./AboutSettings"
import { AppearanceSettings } from "./AppearanceSettings"
import { DataSettings } from "./DataSettings"
import { ProxySettingsPanel } from "./ProxySettingsPanel"
import { RequestLimitsSettings } from "./RequestLimitsSettings"
import { TLSSettingsPanel } from "./TLSSettingsPanel"
import { UpdateSettings } from "./UpdateSettings"

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

/**
 * 设置标签列表。
 * 这里只存图标名而不是 <Icon> 元素：JSX 在模块顶层求值会脱离 solid 的 owner 树
 * （节点永不释放），且元素是模块级单例，同一个 DOM 节点无法同时出现在两处。
 * 图标统一在 tabs() 里按需创建。
 */
const settingsTabs = [
  { key: "appearance", icon: "lucide:palette" },
  { key: "proxy", icon: "lucide:network" },
  { key: "tls", icon: "lucide:shield-check" },
  { key: "request", icon: "lucide:gauge" },
  { key: "data", icon: "lucide:database" },
  { key: "update", icon: "lucide:refresh-cw" },
  { key: "about", icon: "lucide:info" },
]

/**
 * SettingsModal 设置模态框
 */
export function SettingsModal(props: SettingsModalProps) {
  const [activeTab, setActiveTab] = createSignal("appearance")

  // 带国际化标签的 tab 列表
  const tabs = () => settingsTabs.map(tab => ({
    key: tab.key,
    label: t(`settings.${tab.key}`),
    icon: <Icon icon={tab.icon} class="h-4 w-4" />,
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
            case "proxy": return <ProxySettingsPanel scope="global" />
            case "tls": return <TLSSettingsPanel scope="global" />
            case "request": return <RequestLimitsSettings />
            case "data": return <DataSettings />
            case "update": return <UpdateSettings />
            case "about": return <AboutSettings />
            default: return null
          }
        }}
      </SideTabs>
    </Dialog>
  )
}
