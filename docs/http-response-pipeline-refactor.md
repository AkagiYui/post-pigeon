# HTTP 响应处理管线重构设计

## 1. 目标

PostPigeon 的 HTTP 请求处理统一采用增量式生命周期模型：响应头到达后立即展示，响应体持续读取并报告进度，大响应自动落入应用私有临时文件，前端仅接收状态、进度和有界预览。

本次重构不保留旧 `SendRequest`、`HTTPResponseData`、`http:stream`、HTTP `StopStream` 或旧响应数据库结构的运行时兼容层，只执行一次性数据迁移。

核心目标：

- 响应头与响应体生命周期分离。
- 普通文本、结构化记录流和二进制响应共用一个 HTTP 请求状态机。
- 响应体不再以无上限字符串或 Base64 通过 Wails IPC。
- 后端请求快照是事实来源，事件只承担实时通知职责。
- 网络传输完成、后置脚本处理完成和持久化完成具有独立状态。
- 大响应处理的后端内存和前端内存占用不随响应体大小线性增长。
- 历史列表和历史详情首屏永远不读取请求体、响应体或大段执行链 JSON。

### 1.1 不可退让的架构约束

以下四项是本次重构的强制边界，不得在实现阶段降级为可选优化：

1. 大响应必须落入应用私有临时文件；UI、Wails IPC、事件和数据库关系行只传递不透明 `BodyRef` 与有界元数据，禁止传递完整正文、Base64 副本或真实文件路径。
2. 大正文默认进入 `metadata-only` 展示状态；前端不得自动解码、格式化、语法高亮、创建完整 Blob 或挂载完整文本编辑器，只有用户显式打开正文后才能分片读取。
3. 历史列表、详情 Overview、attempt 列表和正文读取必须是四套独立查询与 DTO；列表和详情首屏不得通过隐藏字段、序列化后删除字段或前端丢弃字段来模拟懒加载。
4. 网络读取、临时文件、正文预览、IPC、脚本读取和长期持久化必须分别设置硬体积边界；命中边界时仍保存历史元数据并记录明确原因，禁止静默丢弃整条历史。

## 2. 总体架构

```text
前端 StartRequest
       │
       ▼
RequestRegistry ── request.accepted
       │
       ▼
RequestEngine ──── response.head ───────────────► 立即显示状态码和 Header
       │
       ▼
ResponsePipeline
  ├─ 原始流量计数 ─ response.progress ─────────► 进度、速度、已接收大小
  ├─ 解压与字符集识别
  ├─ 文本预览 ──── response.preview ───────────► 有界增量预览
  ├─ SSE/NDJSON ─ response.records ────────────► Timeline
  ├─ Adaptive Spool ─ 内存小响应 / 临时文件大响应
  └─ SHA-256、大小、截断状态
       │
       ▼
Post-response Script ─ processing
       │
       ▼
Persistence ───────── request.completed ───────► 最终响应、历史与文件操作
```

### 2.1 模块边界

后端拆分为以下模块：

- `RequestEngine`：请求准备、认证、重定向、传输和整体生命周期编排。
- `RequestRegistry`：活跃请求、取消控制、事件序号和最新快照。
- `ResponsePipeline`：唯一的响应体读取循环。
- `ResponseClassifier`：判定文本、二进制或结构化记录流。
- `ResponseSpool`：小响应内存保存，超过阈值后转入临时文件。
- `BodyArtifactService`：请求体和响应体按需读取、导出、保留和清理。
- `ResponseEventPublisher`：事件节流、批处理和发布。
- `ResponsePersistence`：请求执行链、响应快照、历史和 artifact 引用持久化。
- `HistoryQueryService`：历史摘要、详情元数据、attempt 和正文的分层查询。

前端拆分为以下模块：

- `httpRequestStore`：所有 HTTP 请求生命周期的全局状态。
- `ResponseSummaryBar`：状态码、耗时、大小和速度。
- `TransferProgress`：实时传输状态与取消操作。
- `TextResponseViewer`：增量文本预览和完成后的完整查看。
- `StructuredResponseViewer`：JSON、XML、HTML 等结构化内容。
- `BinaryResponseViewer`：二进制元数据、文件操作和十六进制头部。
- `RecordStreamViewer`：SSE、NDJSON 和 JSON Sequence Timeline。
- `ResponseProcessingState`：后置脚本和持久化状态。

WebSocket 继续使用独立连接模型，不并入 HTTP 响应管线。

## 3. 请求生命周期

统一状态机如下：

```text
accepted
→ preparing
→ connecting
→ receiving_headers
→ receiving_body
→ processing
→ persisting
→ completed

任意阶段可进入：
failed / cancelled / timed_out / truncated_by_policy / interrupted
```

状态语义：

- `accepted`：请求已在后端登记，可以取消。
- `preparing`：执行变量解析、前置操作、认证和请求体构建。
- `connecting`：请求已进入网络传输层，正在等待响应头。
- `receiving_headers`：已经收到某次网络 attempt 的响应头。
- `receiving_body`：正在读取最终响应体。
- `processing`：网络读取完成，正在运行后置脚本或生成 effective response。
- `persisting`：正在提交最终请求执行链、响应快照和历史记录。
- `completed`：传输、处理和持久化均已完成。
- `truncated_by_policy`：达到网络或解压后响应上限而主动中止。
- `interrupted`：应用异常退出导致未完成。

行为约束：

- 最终响应头到达后立即发布 `response.head`，不能等待响应体读取。
- 重定向、Digest challenge、认证重试等每次 RoundTrip 都发布 `request.attempt`。
- 响应体读取失败时仍保留已收到的状态码、Header、Cookie、TTFB 和部分传输数据。
- 普通 HTTP 和 SSE 使用统一的 `CancelRequest(requestID)`。
- 同一个 `requestID` 的状态只能单向推进，终态不能被晚到事件覆盖。

## 4. Go 与前端通信协议

### 4.1 服务接口

```text
StartRequest(data) -> RequestAccepted
CancelRequest(requestID)
GetRequestSnapshot(requestID)
ReadResponseBody(bodyRef, offset, length)
ExportResponseBody(bodyRef, suggestedName)
RetainBodyArtifact(bodyRef)
ReleaseRequest(requestID)
ReissueRequestWithLimitOverride(requestID)
```

`StartRequest` 只负责验证输入、登记请求和启动后台执行，不能等待网络请求完成。

### 4.2 统一事件

所有 HTTP 生命周期事件使用同一个事件名：

```text
http:request-event
```

事件公共字段：

- `requestId`
- `sequence`
- `kind`
- `timestamp`
- 与 `kind` 对应的有界 payload

事件类型：

- `request.accepted`
- `request.prepared`
- `request.attempt`
- `response.head`
- `response.mode`
- `response.progress`
- `response.preview`
- `response.records`
- `response.processing`
- `response.persisting`
- `request.completed`
- `request.failed`
- `request.cancelled`
- `request.timed_out`
- `request.truncated`

每个请求的 `sequence` 必须严格单调递增。前端发现重复事件时忽略，发现序号缺口时调用 `GetRequestSnapshot` 修复状态。事件总线不能作为唯一事实来源。

### 4.3 快照

请求快照至少包含：

- 当前生命周期状态和 revision。
- configured request、prepared request 和网络 attempts。
- 最终响应头。
- 当前传输进度。
- 当前有界文本预览。
- 最近一页结构化流记录及分页游标。
- wire body 和 effective body 的引用。
- 后置脚本结果。
- 当前错误或终态结果。

### 4.4 `BodyRef` 与 IPC 元数据契约

`BodyRef` 是后端签发的不透明能力引用。前端不能拼接、解析或持久保存底层路径，只能把它传回 `ReadResponseBody`、`ExportResponseBody`、`RetainBodyArtifact` 和 `ReleaseRequest`。

```text
BodyRef {
  id
  revision
  direction
  availability
  complete
  size
  sha256
  mediaType
  charset
  contentEncoding
  previewAvailable
  pageable
  expiresAt
}
```

字段约束：

- `availability` 取值为 `memory`、`temporary`、`retained`、`omitted` 或 `deleted`。
- `size` 和 `sha256` 在传输未结束时可以为空，完成后以最终快照为准。
- `BodyRef` 不包含绝对路径、相对路径、文件句柄、正文片段或 Base64。
- `response.head`、`response.progress` 和历史摘要只携带所需的 Body 元数据，不携带 `BodyRef` 对应内容。
- `BodyRef` 必须绑定当前用户、项目和正文方向；越权、过期或 revision 不匹配时拒绝读取。
- 单次正文切片响应必须遵守 256 KiB IPC 上限，并返回实际 offset、长度、EOF 和当前 revision。

## 5. 响应读取管线

响应体只能由 `ResponsePipeline` 读取一次。单一读取循环同时完成：

- 原始网络字节计数。
- 内容解码后的字节计数。
- SHA-256 计算。
- 有界文本预览。
- SSE、NDJSON 或 JSON Sequence 解析。
- Adaptive Spool 写入。
- transport capture 更新。
- 受节流控制的进度和预览事件发布。

禁止为 UI、脚本、历史、文件导出或响应快照分别复制完整响应体。

### 5.1 背压

- 网络读取、解压和 artifact 写入位于同一受控管线中。
- 磁盘写入速度自然向网络读取施加背压。
- 不为每个网络 chunk 创建 goroutine。
- 不建立无界 channel 或无界事件队列。
- 进度事件最多每个请求每 100 毫秒发送一次。
- 文本预览按时间和大小共同批处理，不映射底层网络 chunk 边界。

### 5.2 资源释放

- Response Body 只能关闭一次。
- 请求取消必须同时终止网络读取、解压器、spool 写入和事件发布。
- 所有终态统一从一个 finalize 路径完成 registry 清理。
- 应用关闭时先取消请求，再等待 artifact 写入和数据库事务安全退出。

## 6. 响应分类

分类优先级：

1. 接口设置显式覆盖：`auto`、`text`、`binary`、`record-stream`。
2. `Content-Disposition: attachment` 优先判定为 binary。
3. SSE、NDJSON、JSON Sequence 判定为 record-stream。
4. 明确的文本、JSON、XML、HTML MIME 判定为 text。
5. 图片、音频、视频、PDF、压缩包、可执行文件等判定为 binary。
6. MIME 缺失或为 `application/octet-stream` 时读取最多 512 字节进行嗅探。
7. 无法可靠判断时按 binary 处理。

响应头展示不能等待内容嗅探。`response.head` 中的模式可以暂为 `pending`，分类完成后通过 `response.mode` 更新。

普通 chunked 文本允许增量预览，但不能作为结构化记录流展示。只有 SSE、NDJSON 和 JSON Sequence 进入 Timeline。

## 7. 响应体存储和限额

### 7.1 Adaptive Spool

- 响应体开始时使用内存 spool。
- 超过 2 MiB 后自动转入应用私有临时文件。
- 切换过程不能丢字节或重新读取网络 Body。
- 临时文件只允许当前用户读写。
- 前端只接收不可猜测的 `bodyRef`，不能接收真实路径。
- 失败或取消产生的部分 artifact 标记为 `incomplete`。
- 默认临时 artifact 保留 24 小时。
- 用户显式保留后转为持久 artifact。
- 启动时清理过期 artifact 和无主 `.part` 文件。

临时文件写入规则：

- 使用随机 artifact ID 和 `.part` 后缀在应用私有目录创建，权限固定为当前用户读写。
- 先把内存 spool 已有字节写入 `.part`，再继续承接同一个网络读取循环；切换期间不能并行维护内存与文件两份完整正文。
- 传输完成后关闭并同步文件，校验大小和 SHA-256，再原子提交为可读取 artifact。
- 传输中 UI 只能取得进度、有限预览和 `BodyRef`；不能取得临时路径。
- 取消、超时和网络失败保留有界诊断信息，部分文件按策略标记为 `incomplete` 或立即回收。
- 临时文件复制、保留和导出全部由 Go 后端完成，禁止先读取进前端再写回磁盘。

### 7.2 默认限额

| 设置 | 默认值 | 含义 |
|---|---:|---|
| 最大网络传输量 | 1 GiB | 防止无限响应占满磁盘 |
| 最大解压后响应量 | 1 GiB | 防止压缩炸弹 |
| 实时文本预览 | 1 MiB | 前端实时展示的最大文本 |
| 后置脚本正文读取 | 8 MiB | Goja 可完整读取的最大 Body |
| 历史预览 | 256 KiB | 数据库保存的响应正文预览 |
| IPC 单次 payload | 256 KiB | 单次事件或按需读取上限 |
| 进度事件频率 | 10 次/秒 | 单个请求的最大推送频率 |

实时文本预览上限只适用于小正文。已由 `Content-Length` 判定为大正文，或接收过程中跨过 512 KiB 展示阈值后，前端自动切换为 `metadata-only`，不再接收正文预览事件。

不使用数值 `0` 表示无限制。无限制必须使用明确的 `unlimited` 策略值，并在 UI 中显示资源风险警告。

### 7.3 命中限额

如果响应头中的 `Content-Length` 已超过限制：

- 立即展示响应头。
- 不读取响应体，关闭连接并进入 `truncated_by_policy`。
- 提供“本次忽略限制并重新请求”。
- 不持有连接等待用户决定。

未知长度响应在实际达到限制后中止。网络传输限制和解压后限制分别执行，错误信息必须说明具体命中的限制。

预览限额不影响完整传输，完整传输限额不影响已收到响应头的展示。

## 8. 压缩、大小和进度

关闭 Go Transport 的隐式自动解压，由 ResponsePipeline 显式处理 `gzip`、`deflate` 和 `br`。

记录以下独立指标：

- `declaredWireBytes`：最终响应头中的 Content-Length。
- `wireReceivedBytes`：网络实际接收字节。
- `decodedBodyBytes`：内容解码后的响应体字节。
- `effectiveBodyBytes`：后置脚本处理后的正文大小。
- `wireSha256`：原始网络实体摘要。
- `effectiveSha256`：最终有效正文摘要。

进度条优先使用 `wireReceivedBytes / declaredWireBytes`。总长度未知时显示已接收大小、实时速度和经过时间，不显示伪造百分比。

保存响应默认导出解码后的实体内容；高级操作可以导出 wire body。Header 始终保留服务器返回的真实 `Content-Encoding`。

## 9. 后置脚本语义

后置脚本只在网络响应完整结束后执行。下载过程中 UI 展示 wire response；脚本完成后生成 effective response。二者可以在响应面板中切换。

脚本接口：

```text
pm.response.body.size
pm.response.body.sha256
pm.response.body.complete
pm.response.text()
pm.response.json()
pm.response.readBytes(offset, length)
pm.response.setBody(value)
```

规则：

- 状态码、Header、Cookie、大小和摘要始终可访问。
- `text()` 和 `json()` 超过脚本正文上限时抛出 `BodyTooLargeForScript`。
- 禁止对被截断正文静默执行 JSON 解析。
- `readBytes` 每次读取受 IPC/脚本切片限额约束。
- `setBody` 创建新的 effective artifact，不改写 wire artifact。
- Header 修改同时保留 wire headers 和 effective headers。
- 脚本失败不抹掉网络响应；最终状态为响应成功但脚本失败。
- `pm.sendRequest` 使用相同 BodyReader 和独立的脚本子请求限额，不能保留独立 `io.ReadAll` 路径。

`responseSize` 拆分为 wire、decoded 和 effective 三个大小，避免把传输大小与脚本修改后的展示大小混为一谈。

## 10. 前端状态管理

全局 `httpRequestStore` 按 `requestId` 保存：

```text
phase
revision
responseHead
transferProgress
preview
recordStream
wireBodyRef
effectiveBodyRef
requestRun
scriptResult
persistenceState
error
```

请求标签页只保存 `activeRequestId`，不复制完整响应对象。切换标签不会丢失活跃请求；关闭标签后由 `ReleaseRequest` 明确释放 UI 引用。

HTTP/SSE 状态全部迁入 `httpRequestStore`。现有 stream store 只保留 WebSocket 状态。

前端必须：

- 在调用 `StartRequest` 前建立本地请求状态。
- 全局订阅统一 HTTP 事件，而不是由响应面板临时订阅。
- 忽略终态后的晚到事件。
- 在 sequence 缺口或应用重新激活时主动同步快照。
- 对进度更新使用局部状态，避免重建完整响应组件树。

## 11. 响应界面

### 11.1 摘要栏

响应头到达后立即展示：

- 状态码和状态文本。
- 最终 URL 与重定向次数。
- Content-Type、Content-Encoding 和建议文件名。
- TTFB。
- 实时总耗时。
- 已接收大小、总大小和速度。
- 当前阶段和取消按钮。

### 11.2 文本响应

- 接收中使用轻量、追加式文本预览。
- 不在每个 preview event 后重新格式化完整 JSON/XML。
- 完成且正文不超过 512 KiB 时启用完整 CodeMirror。
- 大文本通过按需分页读取或虚拟列表展示。
- 大 JSON 格式化在 Web Worker 中执行。
- 字符集解码在后端管线中增量进行，正确处理跨 chunk 多字节字符。

大正文的默认规则：

- `Content-Length` 大于 512 KiB 时，从收到响应头起即使用 `metadata-only`；长度未知的响应在实际字节数跨过阈值时切换。
- `metadata-only` 只展示状态、Header、Content-Type、大小、进度、摘要、完整性以及保存操作。
- 前端不得自动调用 `ReadResponseBody`，不得创建 `TextDecoder` 处理完整正文，不得运行 `JSON.parse`、XML pretty、Markdown 渲染、语法高亮或全文搜索。
- 用户点击“加载正文”后首次只读取 256 KiB；后续按 offset 分页，仍不把所有分片无界拼接成一个字符串。
- 只有正文完整且总大小不超过 512 KiB 时，才允许自动 pretty；较大正文即使已全部下载也默认保持分页 raw 模式。
- 后端为了 MIME 嗅探和可选 preview 只能增量解码有界前缀，不能因此构造完整文本副本。

### 11.3 二进制响应

二进制面板展示：

- 建议文件名。
- MIME 类型。
- Content-Disposition。
- wire、decoded 和 effective 大小。
- SHA-256。
- 下载进度。
- 前若干 KiB 的十六进制预览。
- 保存、保留、删除和外部打开操作。

二进制响应不能默认转换为文本或完整 Blob。

### 11.4 媒体预览

- 小图片等内容可以按需读取为有界 Blob。
- 大 PDF、音频、视频和安装包不进入前端内存。
- 超过媒体预览上限时只提供保存或外部打开。
- HTML/XML/SVG 预览继续使用完全 sandbox 的 iframe，禁止脚本、表单、弹窗和同源权限。

### 11.5 结构化记录流

- SSE、NDJSON 和 JSON Sequence 使用同一请求状态，但拥有独立 Timeline 视图。
- 后端保留有界记录窗口并支持分页读取。
- 前端不缓存无限记录，也不缓存完整 Base64 raw chunk 数组。
- 原始流体由 artifact 保存，Raw 视图通过 `bodyRef` 按需读取。
- SSE 重连 attempt 进入同一个 RequestRun。

## 12. 文件导出

响应体导出必须由 Go 后端完成：

- 使用系统原生保存对话框。
- 从 artifact 直接复制，不经过前端 Blob。
- 在目标目录先写 `.part` 文件。
- 完成后关闭、同步并原子重命名。
- 校验最终写入字节数。
- 导出完成后展示 SHA-256。

建议文件名按以下顺序确定：

1. RFC 5987 `filename*`。
2. `Content-Disposition` 的 `filename`。
3. 最终 URL basename。
4. MIME 类型对应的默认扩展名。

文件名必须清理路径分隔符、控制字符、平台保留名称和尾部空格。

### 12.1 断点续传

仅在以下条件全部成立时提供：

- 请求方法为 GET。
- 响应包含 `Accept-Ranges: bytes`。
- 存在强 ETag，或存在可验证的 Last-Modified。
- 用户显式触发续传。

其他请求不能自动添加 Range 或重放请求。验证器变化时必须丢弃旧部分文件并重新下载。

## 13. 数据模型

### 13.1 `response_snapshots`

字段：

- `id`
- `request_run_id`
- `status_code`
- `status`
- `protocol`
- `wire_headers`
- `effective_headers`
- `cookies`
- `content_type`
- `content_encoding`
- `suggested_filename`
- `declared_wire_size`
- `wire_size`
- `decoded_size`
- `effective_size`
- `wire_sha256`
- `effective_sha256`
- `body_mode`
- `transfer_complete`
- `truncation_reason`
- `wire_body_snapshot_id`
- `effective_body_snapshot_id`
- `timing`
- `script_result`
- `created_at`
- `completed_at`

### 13.2 `body_snapshots`

请求体和响应体统一使用正文快照。字段：

- `id`
- `direction`：request、wire-response 或 effective-response
- `media_type`
- `charset`
- `content_encoding`
- `size`
- `sha256`
- `complete`
- `preview`
- `preview_size`
- `preview_truncated`
- `artifact_id`
- `created_at`

正文预览必须位于独立表中，不能嵌入 RequestRun、RequestAttempt、RequestHistory 或 ResponseSnapshot 的 JSON 字段。元数据查询只选择大小、摘要和截断状态，不选择 `preview` 列。

### 13.3 `body_artifacts`

字段：

- `id`
- 应用数据目录内的相对路径
- `media_type`
- `content_encoding`
- `size`
- `sha256`
- `complete`
- `retention`
- `expires_at`
- `created_at`

数据库中不能保存用户可控的绝对路径。所有相对路径在后端经过固定 artifact 根目录解析和校验。

### 13.4 `http_request_snapshots`

configured request、prepared request 和每个 attempt 的实际请求使用规范化请求快照，不再把大段正文预览重复嵌入 RequestRun JSON。字段：

- `id`
- `stage`：configured、prepared 或 transport
- `method`
- `url`
- `request_target`
- `authority`
- `protocol`
- `headers`
- `content_length`
- `transfer_encoding`
- `body_snapshot_id`
- `capture_level`

### 13.5 关系调整

- RequestHistory 只引用 RequestRun，不重复保存完整请求与响应正文。
- Endpoint 保存 `last_request_run_id`，不再拥有独立的旧 Response 行。
- 一个 RequestRun 拥有多个 Attempt 和一个最终 ResponseSnapshot。
- RequestRun 引用 configured 和 prepared 两个 HTTPRequestSnapshot。
- RequestAttempt 引用 transport HTTPRequestSnapshot，不内嵌请求 Body preview。
- wire artifact 与 effective artifact 在未发生脚本正文修改时指向同一对象。

## 14. 历史查询与详情加载

历史读取采用“摘要、元数据、attempt、正文”四层接口。任何列表和详情首屏接口都不能返回正文。

四层接口必须分别定义 `HistorySummary`、`HistoryOverview`、`AttemptSummary`、`BodyInfo/BodySlice` DTO，禁止直接返回 GORM 模型。服务实现必须在 SQL 层显式投影；先 `SELECT *`、Dexie `toArray()` 或完整反序列化，再把 Body 字段设为空，均视为验收失败。

### 14.1 服务接口

```text
ListHistorySummaries(projectID, cursor, limit) -> HistorySummaryPage
GetHistoryOverview(historyID) -> HistoryOverview
ListHistoryAttempts(historyID, cursor, limit) -> AttemptPage
GetHistoryBodyInfo(historyID, side) -> BodyInfo
ReadHistoryBody(historyID, side, offset, length) -> BodySlice
ExportHistoryBody(historyID, side, suggestedName)
```

`side` 取值：

- `configured-request`
- `prepared-request`
- `attempt-request:<attemptID>`
- `wire-response`
- `effective-response`

### 14.2 历史列表

`ListHistorySummaries` 只允许查询：

- history ID、request run ID。
- method、URL 的已脱敏摘要。
- status code、outcome。
- content type。
- wire/decoded/effective size。
- total、TTFB 等摘要计时。
- attempt 数量。
- created time、completed time。
- 是否有请求/响应 preview 或完整 artifact。

禁止选择：

- request body、response body、preview。
- 完整 Header JSON。
- configured/prepared request JSON。
- attempts 集合。
- script 日志和测试明细。

列表使用显式列投影，不能使用 `SELECT *`。分页改为基于 `(created_at, id)` 的稳定游标分页，不使用随数据量增长而变慢的深 offset。

新增组合索引：

```text
request_histories(module_id, created_at DESC, id DESC)
request_histories(request_run_id)
modules(project_id, id)
request_attempts(run_id, sequence)
```

### 14.3 历史详情首屏

打开历史详情只调用 `GetHistoryOverview`，返回：

- 请求方法、脱敏 URL 和时间。
- 响应状态、Header、Cookie 和 Content-Type。
- 请求与响应 BodyInfo，但不包含 preview 字节。
- Timing 摘要。
- RequestRun outcome 和 attempt 数量。
- 脚本执行摘要，不包含完整日志。

详情默认打开 Overview，不默认打开 Body。Request、Response、Attempts、Scripts 标签均为惰性加载。

切换到另一条历史时必须取消上一条尚未完成的详情、attempt 或正文读取，并用 history ID 与本地 load token 阻止晚到结果覆盖当前页面。

### 14.4 请求体和响应体

只有用户进入具体 Body 标签后才调用 `GetHistoryBodyInfo`。BodyInfo 包含：

- 正文类型、字符集和内容编码。
- 完整大小、摘要和完整性。
- preview 大小及是否截断。
- 是否存在可分页读取的 artifact。

正文读取规则：

- preview 也必须单独读取，不能夹带在 overview 中。
- 首次最多读取 256 KiB。
- 用户滚动或点击“继续加载”时按 offset 分页读取。
- 单次读取不超过 256 KiB。
- 大文本使用虚拟列表，不能不断拼接成一个无限增长字符串。
- JSON/XML pretty 只对已经读取的完整小正文启用；大正文保持 raw 分页模式。
- 大请求体与大响应体采用相同读取组件和限额。
- 二进制正文默认只读取数 KiB 十六进制头部。
- 导出历史正文直接从后端 artifact 写文件，不经过前端内存。

前端正文缓存采用有界 LRU，建议最多保留 10 个正文或 10 MiB，以先达到者为准。离开历史页面后释放缓存。

### 14.5 请求正文捕获策略

请求历史默认保存请求体元数据和最多 256 KiB preview，不默认长期保留完整的大请求体。

- 文本和内存请求可以按策略保留完整 artifact。
- 文件上传只保存字段、文件名、大小、媒体类型和摘要；原始文件内容默认不复制进历史。
- multipart 每个 part 单独保存元数据和有界 preview，不能把整个 multipart 正文重复序列化进 configured、prepared 和 attempt 快照。
- 用户开启“完整保留历史正文”后，完整请求和响应 artifact 仍受历史磁盘配额、保留天数和敏感信息策略约束。
- 敏感字段的正文 preview 在写入数据库前脱敏；完整 artifact 默认短期存放且不进入长期历史。

### 14.6 删除和清理

- 删除一条历史只减少其 body snapshot 和 artifact 引用。
- 只有引用计数归零后才能删除物理 artifact。
- 清空模块或项目历史使用批量引用回收，不能逐行加载正文。
- retention 清理只扫描索引字段，不读取 BodySnapshot.preview。
- 清理完成后异步删除物理文件；失败时进入可重试垃圾回收队列。

## 15. 持久化与崩溃恢复

- 请求开始时创建 RequestRun。
- 每个网络 attempt 完成后增量持久化。
- 最终响应头到达后写入 ResponseSnapshot 元数据。
- 请求结束时事务性完成 snapshot、run 和 history 关系。
- 数据库失败不能丢掉当前 UI 响应；请求标记为 `persistence_failed` 并进入可重试队列。
- 历史写入不能因内存队列已满而静默丢弃。
- 应用启动时将残留 `running` 请求标记为 `interrupted`。
- 无主 artifact 和过期临时 artifact 通过启动清理和定时清理共同回收。

敏感信息在持久化前统一脱敏。临时 artifact 包含原始响应内容，只存放在应用私有目录，默认短期保留；长期保存必须由用户显式选择。

### 15.1 持久化体积预算

所有持久化入口共享同一套预算器，在写入前计算并保留命中原因：

| 持久化对象 | 默认硬上限 | 超限行为 |
|---|---:|---|
| RequestHistory、RequestRun、RequestAttempt、ResponseSnapshot 关系行中的正文 | 0 B | 禁止内联，只能引用 BodySnapshot/Artifact |
| 单个 BodySnapshot preview | 256 KiB | 保存前缀并标记 `preview_truncated` |
| 单个响应的 Header 与 Cookie 捕获 | 1 MiB | 停止继续捕获并标记 `metadata_truncated` |
| 单个 RequestRun 的脚本日志和控制台明细 | 1 MiB | 保留结构化摘要和有界尾部，标记 `logs_truncated` |
| 单个持久 artifact | 1 GiB | 受网络/解压后正文上限共同约束 |
| 单项目长期历史 artifact 总量 | 10 GiB | 新记录降为元数据 + preview，标记 `artifact_omitted: quota_exceeded` |
| 全局临时 artifact 总量 | 5 GiB | 先回收过期和无主文件；仍不足时拒绝开始新的大响应并明确报错 |

预算规则：

- 配额判断必须在后端执行，不能依赖前端声明或 UI 是否打开。
- 超过长期历史配额不能丢弃 RequestHistory、RequestRun、ResponseSnapshot、状态码、Header 摘要、大小、哈希或 timing；只允许不保留完整 artifact，并必须向 UI 暴露原因。
- 不能删除正在传输、仍被 UI 引用、正在导出或已被用户显式保留的 artifact 来腾配额。
- preview、Header、脚本日志和 artifact 分别计量，不能用压缩后数据库页大小替代逻辑字节数。
- 配额、保留时间和清理结果必须可观测；设置变更只影响后续写入与明确触发的清理任务。
- 任何截断、遗漏和清理都必须落为结构化状态，禁止仅写日志或返回布尔值。

## 16. Runner 与内部调用方

内部执行接口为：

```text
RequestEngine.Execute(ctx, spec, observer) -> FinalResult
```

- `HTTPService.StartRequest` 注册后台任务，并用 UI observer 发布生命周期事件。
- RunnerService 直接调用 RequestEngine，并使用 runner observer 转换为集合运行进度。
- `pm.sendRequest` 使用 scripting observer 和脚本子请求资源限额。
- 测试可以注入 recording observer，无需依赖全局 Wails Application。

HTTPService 不再同时承担 UI binding、网络执行、响应解析、脚本、存储和历史清理。

## 17. 一次性迁移

- 新建 ResponseSnapshot、BodySnapshot、BodyArtifact 和 HTTPRequestSnapshot 表。
- 把旧 Response 和 RequestHistory 中的正文转换为有界 preview。
- 保留项目、模块、目录、接口、环境、变量和请求执行链数据。
- Endpoint 最近响应关系迁移为 `last_request_run_id`。
- 删除旧 Response 表和 RequestHistory 中重复的正文、Header、Timing 字段。
- 删除旧 HTTP streaming 事件和前端 store。
- 删除旧 `HTTPResponseData`、`SendRequest`、`StopStream` HTTP 路径。
- 重新生成 Wails bindings。
- 不建立双写、双读、协议协商或旧客户端降级路径。

## 18. 测试计划

### 18.1 后端单元测试

- Slow server 发送 Header 后暂停，验证 `response.head` 在 Body EOF 前到达。
- 覆盖全部状态机转换和非法转换。
- 验证 UTF-8 多字节字符跨 chunk 不乱码。
- 验证 SSE、NDJSON、JSON Sequence 跨 chunk 解析。
- 验证二进制响应不产生完整 Body 或 Base64 事件。
- 验证内存 spool 跨阈值转文件后字节和摘要一致。
- 验证 gzip、deflate、br 的 wire/decoded 计数。
- 验证压缩炸弹命中 decoded limit。
- 验证取消、超时、网络中断保留响应头和部分 artifact。
- 验证重定向、Digest、Cookie、代理、TLS 和 RequestRun attempt 链。
- 验证脚本读取上限、wire/effective 分离和 `setBody`。
- 验证持久化失败重试和崩溃恢复。
- 验证 artifact 路径穿越防护和文件名清理。
- 验证历史列表和 overview SQL 不选择任何正文或 preview 列。
- 验证 50 条大正文历史的列表响应大小与正文大小无关。
- 验证历史正文 offset/length 边界、最大切片和越权访问防护。
- 验证删除、retention 和 artifact 引用计数回收。
- 验证大响应只通过 BodyRef 暴露，事件、快照和 DTO 中不存在路径、完整正文或 Base64。
- 验证所有持久化预算的边界值、超限状态和元数据保留行为。
- 验证长期配额超限仍能查询历史摘要和 Overview，且明确返回 `artifact_omitted` 原因。

### 18.2 前端单元测试

- 响应头事件立即创建响应面板。
- sequence 重复、乱序和缺失处理。
- snapshot 修复和应用重新激活同步。
- 标签切换、关闭和重新打开不会串请求。
- 接收过程中不反复创建 CodeMirror。
- 大文本按需读取和虚拟化。
- 二进制响应不创建完整 Blob。
- 取消后的晚到事件不能覆盖下一次请求。
- wire/effective response 切换。
- 脚本失败和持久化失败的独立状态展示。
- 打开历史详情首屏不调用任何 Body 读取接口。
- 只有激活具体 Body 标签后才读取对应 preview。
- 快速切换历史时晚到正文不能覆盖当前历史。
- 历史正文分页和有界 LRU 淘汰正确。
- 大正文初始状态不调用正文读取、解码、格式化、高亮或完整 Blob 创建逻辑。
- 用户显式加载大正文后每次只消费一个有界 BodySlice，切回 Overview 后可释放缓存。

### 18.3 集成测试

测试服务器提供：

- 立即 Header、延迟 Body。
- 固定长度慢速二进制下载。
- 未知长度 chunked 响应。
- gzip/br 大响应和压缩炸弹。
- 中途断开和错误 Content-Length。
- SSE 重连及 Last-Event-ID。
- NDJSON/JSON Sequence 跨包。
- 支持 Range、ETag 和 If-Range 的下载。

前后端集成测试验证从 `StartRequest` 到最终 artifact 导出的完整链路。

历史集成测试额外准备 50 条各自带 1 GiB artifact 元数据的记录，验证列表和 overview 不读取 artifact，不传输 preview，首屏耗时与 artifact 大小无关。

### 18.4 性能测试

- 1 KiB、1 MiB、120 MiB 和 1 GiB 合成响应。
- 10 个并发大响应。
- 长时间 SSE/NDJSON 流。
- 大量小 chunk 响应。
- 慢速磁盘和事件消费者阻塞。
- 包含大量大请求/响应记录的历史列表与详情首屏。

性能门槛：

- Go heap 和前端 JS heap 对大响应保持 O(1)。
- 单次 IPC payload 不超过 256 KiB。
- 单个请求的进度事件不超过 10 次/秒。
- 不出现无界 goroutine、channel、事件或前端数组增长。
- 持续下载期间 WebView 保持可交互。
- 历史列表 IPC 大小仅随行数增长，不随正文大小增长。
- 历史 overview 只产生一次小型元数据查询，不触发正文反序列化。

## 19. 端到端验收标准

对于一个约 115 MiB、支持 Range 的 Windows 安装包响应：

- 最终响应头到达后立即显示状态码和 Header。
- 重定向链在 Actual Request 面板中实时可见。
- 不等待读取 32 MiB 后才创建响应结果。
- 实时显示已接收字节、总大小、速度和经过时间。
- 完整下载不受 1 MiB 预览上限影响。
- Go 和前端都不持有完整响应体副本。
- 前端不接收完整 Body Base64。
- 导出文件字节数和 SHA-256 与接收到的实体一致。
- 取消后及时关闭连接并正确处理 `.part`。
- 历史数据库只保存元数据和有界预览。
- 在历史列表和详情 Overview 中查看该请求时，不读取其请求体、响应体或 artifact。
- 进入 Body 标签后只读取首个 256 KiB 分片，页面立即可返回和切换。
- 只有显式导出时才顺序读取完整 artifact，且不经过前端 IPC。

## 20. 实施顺序

1. 固定状态机、事件协议、BodyRef、限额和数据库模型。
2. 实现应用私有临时 artifact store、Adaptive Spool、BodyRef 授权、计数、哈希、配额和清理。
3. 实现 ResponseClassifier 和统一 ResponsePipeline。
4. 将 HTTP 执行拆分为 RequestEngine 和 observer。
5. 接入 transport capture、重定向、认证、Cookie、代理和 TLS。
6. 重构后置脚本和 `pm.sendRequest`。
7. 实现增量持久化、最终事务和崩溃恢复。
8. 建立新的 Wails 请求服务、事件发布和快照同步。
9. 实现前端 `httpRequestStore` 和请求状态机。
10. 重做响应摘要、文本、二进制和记录流面板，落实大正文 `metadata-only` 默认状态。
11. 接入后端文件导出和 artifact 保留操作。
12. 实现历史摘要、overview、attempt 和正文分层 DTO、显式 SQL 投影与游标查询。
13. 重做历史详情的惰性标签、分页正文和有界 LRU。
14. 接入 RunnerService。
15. 执行一次性数据库迁移并重新生成 bindings。
16. 删除全部旧协议、旧字段和旧 HTTP stream store。
17. 完成单元、集成、性能和真实 staging 验收。

## 21. 审核决策

本设计需要整体接受以下决策：

1. 大 Body 统一采用 `bodyRef + artifact`，禁止完整内容穿过 IPC。
2. 默认完整传输上限为 1 GiB，实时文本预览上限独立为 1 MiB。
3. 后置脚本完整读取上限为 8 MiB，超过后明确失败，不静默截断。
4. 普通 HTTP、文本增量响应和 SSE 使用同一状态机；WebSocket 保持独立。
5. wire response 与脚本生成的 effective response 分开保存和展示。
6. HTTP 请求事件只是通知，后端快照是事实来源。
7. 历史写入不允许因内存队列拥塞而静默丢弃。
8. 旧响应表、旧事件协议和旧前端状态结构直接删除，只执行一次性数据迁移。
9. 历史列表和详情首屏只返回元数据，所有请求体、响应体、attempt 和脚本明细均按需加载。
10. Body preview 位于独立表且单独读取，不能嵌入历史列表或 RequestRun JSON。
11. 历史正文采用 256 KiB 分页读取和有界 LRU，禁止恢复为一次性完整 Body IPC。
12. 大正文默认 `metadata-only`，未获用户显式操作前不得读取、解码、格式化或完整渲染。
13. 持久化体积边界必须在后端统一执行；超限时保留历史元数据并返回结构化原因，禁止静默丢弃。
