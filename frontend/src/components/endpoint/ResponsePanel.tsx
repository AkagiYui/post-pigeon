// 响应面板组件
import { createSignal, Show } from 'solid-js'
import { t } from '@/hooks/useI18n'
import { Table } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ResponseData } from './EndpointDetail'

/** 渲染模式选项 */
const renderModeOptions = [
    { value: 'pretty', label: t('response.pretty') },
    { value: 'raw', label: t('response.raw') },
    { value: 'preview', label: t('response.preview') },
]

/** 格式化方式选项 */
const formatOptions = [
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'html', label: 'HTML' },
]

/** 编码选项 */
const encodingOptions = [
    { value: 'utf-8', label: 'UTF-8' },
    { value: 'gbk', label: 'GBK' },
    { value: 'gb2312', label: 'GB2312' },
    { value: 'iso-8859-1', label: 'ISO-8859-1' },
]

export interface ResponsePanelProps {
    tab: string
    response: ResponseData
}

export function ResponsePanel(props: ResponsePanelProps) {
    const [renderMode, setRenderMode] = createSignal('pretty')
    const [format, setFormat] = createSignal('json')
    const [encoding, setEncoding] = createSignal('utf-8')

    return (
        <div class="h-full flex flex-col">
            <Show when={props.tab === 'body'}>
                {/* 渲染工具栏 */}
                <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
                    <Select options={renderModeOptions} value={renderMode()} onChange={setRenderMode} size="sm" class="w-24" />
                    <Show when={renderMode() === 'pretty'}>
                        <Select options={formatOptions} value={format()} onChange={setFormat} size="sm" class="w-20" />
                    </Show>
                    <Show when={renderMode() === 'pretty' || renderMode() === 'raw'}>
                        <Select options={encodingOptions} value={encoding()} onChange={setEncoding} size="sm" class="w-24" />
                    </Show>
                </div>
                {/* 响应体内容 */}
                <div class="flex-1 overflow-auto p-3">
                    <pre class="text-sm font-mono whitespace-pre-wrap break-all text-foreground">
                        {props.response.body || '(empty)'}
                    </pre>
                </div>
            </Show>

            <Show when={props.tab === 'headers'}>
                <div class="p-3 overflow-auto">
                    <Table
                        columns={[
                            { header: 'Name', field: 'name' },
                            { header: 'Value', field: 'value' },
                        ]}
                        data={Object.entries(props.response.headers || {}).map(([name, values]) => ({
                            name,
                            value: Array.isArray(values) ? values.join(', ') : values,
                        }))}
                        compact
                    />
                </div>
            </Show>

            <Show when={props.tab === 'cookies'}>
                <div class="p-3 overflow-auto">
                    <Table
                        columns={[
                            { header: 'Name', field: 'name' },
                            { header: 'Value', field: 'value' },
                            { header: 'Domain', field: 'domain' },
                            { header: 'Path', field: 'path' },
                            { header: 'Expires', field: 'expires' },
                        ]}
                        data={(props.response.cookies || []) as any[]}
                        compact
                    />
                </div>
            </Show>

            <Show when={props.tab === 'actualRequest'}>
                <div class="p-3 overflow-auto">
                    <pre class="text-sm font-mono whitespace-pre-wrap break-all text-foreground">
                        {JSON.stringify(props.response.actualRequest, null, 2)}
                    </pre>
                </div>
            </Show>
        </div>
    )
}
