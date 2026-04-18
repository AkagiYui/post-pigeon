import { createSignal, createEffect, onCleanup, For } from 'solid-js'
import { createFileRoute } from '@tanstack/solid-router'
import { ArrowRight, Cpu, PlugZap, Send, TimerReset } from 'lucide-solid'
import { Events } from '@wailsio/runtime'

import { GreetService } from '../../bindings/post-pigeon'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const [name, setName] = createSignal('')
  const [result, setResult] = createSignal('Please enter your name below')
  const [timeMessage, setTimeMessage] = createSignal('Listening for Time event...')
  const [submitting, setSubmitting] = createSignal(false)

  createEffect(() => {
    const unsubscribe = Events.On('time', (time) => {
      if (typeof time?.data === 'string') {
        setTimeMessage(time.data)
      }
    })

    onCleanup(() => {
      unsubscribe()
    })
  })

  async function handleGreet() {
    const trimmedName = name().trim() || 'anonymous'
    setSubmitting(true)

    try {
      const message = await GreetService.Greet(trimmedName)
      setResult(message)
    } catch (error) {
      console.error(error)
      setResult('Greeting failed, please check the runtime log.')
    } finally {
      setSubmitting(false)
    }
  }

  const features = [
    {
      icon: Cpu,
      title: 'Wails 桌面集成',
      desc: '延续现有 bindings 和事件通道，不重写后端交互方式。',
    },
    {
      icon: PlugZap,
      title: '可持续扩展',
      desc: '以路由和组件边界为核心，为后续刷机流程留出演进空间。',
    },
    {
      icon: TimerReset,
      title: '实时事件入口',
      desc: '保留 time 事件订阅模式，便于后续接日志、进度和设备状态。',
    },
  ]

  const nextSteps = [
    ['设备发现', '可以在新路由里接串口扫描、设备识别和连接状态。'],
    ['刷写流程', '把固件选择、进度条、日志流、结果页拆成独立模块。'],
    ['异常处理', '对接 Wails 事件后，统一做 toast、日志面板和错误态。'],
    ['信息页面', '后续可补设置页、关于页、调试页，而不再堆在单页面里。'],
  ]

  return (
    <main class="page-shell px-3 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8">
      <section class="glass-panel rise-in relative overflow-hidden rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div class="absolute -left-24 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(14,165,164,0.18),transparent_68%)]" />
        <div class="absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.16),transparent_68%)]" />

        <div class="relative z-10 grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-start">
          <div>
            <p class="section-kicker mb-3">ESP Auto Flash</p>
            <h1 class="headline-font max-w-3xl text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
              用 SolidJS 和类型安全路由，重建你的 Wails 前端基础设施。
            </h1>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
              当前页面保留了原模板的问候交互和 time 事件监听，但整体结构已经切换到适合后续扩展的 SolidJS + TypeScript + TanStack Router 方案，后面可以继续拆页面、接设备流程、补状态管理。
            </p>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <For each={features}>
                {(feature, index) => {
                  const Icon = feature.icon
                  return (
                    <article
                      class="rounded-3xl border border-[var(--line)] bg-white/70 p-4 shadow-[0_12px_24px_rgba(18,32,39,0.05)]"
                      style={{ 'animation-delay': `${index() * 80 + 80}ms` }}
                    >
                      <Icon class="h-5 w-5 text-[var(--accent-deep)]" />
                      <h2 class="mt-3 text-sm font-bold text-[var(--ink)]">{feature.title}</h2>
                      <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{feature.desc}</p>
                    </article>
                  )
                }}
              </For>
            </div>
          </div>

          <section class="glass-panel rounded-[1.75rem] border-white/50 p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="section-kicker mb-2">Runtime Demo</p>
                <h2 class="headline-font text-2xl font-bold text-[var(--ink)]">保留原有问候逻辑</h2>
              </div>
              <div class="rounded-2xl border border-[var(--line)] bg-[var(--accent-fade)] p-3 text-[var(--accent-deep)]">
                <Send class="h-5 w-5" />
              </div>
            </div>

            <div class="mt-5 rounded-3xl border border-[var(--line)] bg-[var(--hero)]/80 p-4">
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-deep)]">
                Greeting Result
              </p>
              <p class="mt-3 min-h-14 text-base leading-7 text-[var(--ink)]">{result()}</p>
            </div>

            <label class="mt-5 block text-sm font-medium text-[var(--ink)]">
              输入名称
              <input
                aria-label="input"
                class="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(14,165,164,0.12)]"
                type="text"
                autocomplete="off"
                value={name()}
                onInput={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !submitting()) {
                    void handleGreet()
                  }
                }}
                placeholder="例如：ESP 开发者"
              />
            </label>

            <button
              aria-label="greet-btn"
              class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#0b151a] disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={submitting()}
              onClick={() => {
                void handleGreet()
              }}
            >
              <span>{submitting() ? '发送中...' : 'Greet'}</span>
              <ArrowRight class="h-4 w-4" />
            </button>

            <div class="mt-5 rounded-3xl border border-dashed border-[rgba(14,165,164,0.22)] bg-white/70 p-4">
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-[var(--warning)]">
                Time Event
              </p>
              <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{timeMessage()}</p>
            </div>
          </section>
        </div>
      </section>

      <section class="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article class="glass-panel rounded-[1.75rem] p-5 sm:p-6">
          <p class="section-kicker mb-2">What Changed</p>
          <h2 class="headline-font text-2xl font-bold text-[var(--ink)]">这次重构做了什么</h2>
          <ul class="mt-4 space-y-3 pl-5 text-sm leading-7 text-[var(--ink-soft)] marker:text-[var(--accent)]">
            <li>移除了原生 JavaScript 入口，改为 SolidJS + TypeScript。</li>
            <li>引入 TanStack Router，后续新增页面和流程可以直接走文件路由。</li>
            <li>接入 Tailwind v4 和 lucide-solid，统一视觉和图标基础设施。</li>
            <li>保留 GreetService 和 Events.On 的现有 Wails 交互方式。</li>
          </ul>
        </article>

        <article class="glass-panel rounded-[1.75rem] p-5 sm:p-6">
          <p class="section-kicker mb-2">Next Foundation</p>
          <h2 class="headline-font text-2xl font-bold text-[var(--ink)]">适合后续开发的页面骨架</h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <For each={nextSteps}>
              {([title, desc]) => (
                <div class="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
                  <h3 class="text-sm font-bold text-[var(--ink)]">{title}</h3>
                  <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{desc}</p>
                </div>
              )}
            </For>
          </div>
        </article>
      </section>
    </main>
  )
}