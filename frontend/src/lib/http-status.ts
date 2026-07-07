// HTTP 状态码释义表：hover 响应状态码时展示「名称 + 说明」，随界面语言切换。
// 数据整理自标准 HTTP 状态码释义（含少量非标准 / 厂商扩展码），中英双语。
import { language } from "@/hooks/useI18n"

export interface StatusInfo {
  /** 原因短语，如 "Not Found" / "未找到" */
  name: string
  /** 该状态码的详细说明 */
  detail: string
}

const EN: Record<number, StatusInfo> = {
  100: { name: "Continue", detail: "This means that the server has received the request headers, and that the client should proceed to send the request body (in the case of a request for which a body needs to be sent; for example, a POST request). If the request body is large, sending it to a server when a request has already been rejected based upon inappropriate headers is inefficient. To have a server check if the request could be accepted based on the request's headers alone, a client must send Expect: 100-continue as a header in its initial request and check if a 100 Continue status code is received in response before continuing (or receive 417 Expectation Failed and not continue)." },
  101: { name: "Switching Protocols", detail: "This means the requester has asked the server to switch protocols and the server is acknowledging that it will do so." },
  102: { name: "Processing (WebDAV) (RFC 2518)", detail: "As a WebDAV request may contain many sub-requests involving file operations, it may take a long time to complete the request. This code indicates that the server has received and is processing the request, but no response is available yet. This prevents the client from timing out and assuming the request was lost." },
  103: { name: "Checkpoint", detail: "This code is used in the Resumable HTTP Requests Proposal to resume aborted PUT or POST requests." },
  122: { name: "Request-URI too long", detail: "This is a non-standard IE7-only code which means the URI is longer than a maximum of 2083 characters." },
  200: { name: "OK", detail: "Standard response for successful HTTP requests. The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request the response will contain an entity describing or containing the result of the action." },
  201: { name: "Created", detail: "The request has been fulfilled and resulted in a new resource being created." },
  202: { name: "Accepted", detail: "The request has been accepted for processing, but the processing has not been completed. The request might or might not eventually be acted upon, as it might be disallowed when processing actually takes place." },
  203: { name: "Non-Authoritative Information (since HTTP/1.1)", detail: "The server successfully processed the request, but is returning information that may be from another source." },
  204: { name: "No Content", detail: "The server successfully processed the request, but is not returning any content." },
  205: { name: "Reset Content", detail: "The server successfully processed the request, but is not returning any content. Unlike a 204 response, this response requires that the requester reset the document view." },
  206: { name: "Partial Content", detail: "The server is delivering only part of the resource due to a range header sent by the client. The range header is used by tools like wget to enable resuming of interrupted downloads, or split a download into multiple simultaneous streams" },
  207: { name: "Multi-Status (WebDAV) (RFC 4918)", detail: "The message body that follows is an XML message and can contain a number of separate response codes, depending on how many sub-requests were made." },
  208: { name: "Already Reported (WebDAV) (RFC 5842)", detail: "The members of a DAV binding have already been enumerated in a previous reply to this request, and are not being included again." },
  226: { name: "IM Used (RFC 3229)", detail: "The server has fulfilled a GET request for the resource, and the response is a representation of the result of one or more instance-manipulations applied to the current instance. " },
  300: { name: "Multiple Choices", detail: "Indicates multiple options for the resource that the client may follow. It, for instance, could be used to present different format options for video, list files with different extensions, or word sense disambiguation." },
  301: { name: "Moved Permanently", detail: "This and all future requests should be directed to the given URI." },
  302: { name: "Found", detail: "This is an example of industrial practice contradicting the standard. HTTP/1.0 specification (RFC 1945) required the client to perform a temporary redirect (the original describing phrase was \"Moved Temporarily\"), but popular browsers implemented 302 with the functionality of a 303. Therefore, HTTP/1.1 added status codes 303 and 307 to distinguish between the two behaviours. However, some Web applications and frameworks use the 302 status code as if it were the 303.\\" },
  303: { name: "See Other", detail: "The response to the request can be found under another URI using a GET method. When received in response to a POST (or PUT/DELETE), it should be assumed that the server has received the data and the redirect should be issued with a separate GET message." },
  304: { name: "Not Modified", detail: "Indicates the resource has not been modified since last requested. Typically, the HTTP client provides a header like the If-Modified-Since header to provide a time against which to compare. Using this saves bandwidth and reprocessing on both the server and client, as only the header data must be sent and received in comparison to the entirety of the page being re-processed by the server, then sent again using more bandwidth of the server and client." },
  305: { name: "Use Proxy (since HTTP/1.1)", detail: "Many HTTP clients (such as Mozilla and Internet Explorer) do not correctly handle responses with this status code, primarily for security reasons." },
  306: { name: "Switch Proxy", detail: "No longer used. Originally meant \"Subsequent requests should use the specified proxy.\"\\" },
  307: { name: "Temporary Redirect (since HTTP/1.1)", detail: "In this occasion, the request should be repeated with another URI, but future requests can still use the original URI. In contrast to 303, the request method should not be changed when reissuing the original request. For instance, a POST request must be repeated using another POST request." },
  308: { name: "Resume Incomplete", detail: "This code is used in the Resumable HTTP Requests Proposal to resume aborted PUT or POST requests." },
  400: { name: "Bad Request", detail: "The request cannot be fulfilled due to bad syntax." },
  401: { name: "Unauthorized", detail: "Similar to 403 Forbidden, but specifically for use when authentication is possible but has failed or not yet been provided. The response must include a WWW-Authenticate header field containing a challenge applicable to the requested resource." },
  402: { name: "Payment Required", detail: "Reserved for future use. The original intention was that this code might be used as part of some form of digital cash or micropayment scheme, but that has not happened, and this code is not usually used. As an example of its use, however, Apple\\'s MobileMe service generates a 402 error (\"httpStatusCode:402\" in the Mac OS X Console log) if the MobileMe account is delinquent.\\" },
  403: { name: "Forbidden", detail: "The request was a legal request, but the server is refusing to respond to it. Unlike a 401 Unauthorized response, authenticating will make no difference." },
  404: { name: "Not Found", detail: "The requested resource could not be found but may be available again in the future. Subsequent requests by the client are permissible." },
  405: { name: "Method Not Allowed", detail: "A request was made of a resource using a request method not supported by that resource; for example, using GET on a form which requires data to be presented via POST, or using PUT on a read-only resource." },
  406: { name: "Not Acceptable", detail: "The requested resource is only capable of generating content not acceptable according to the Accept headers sent in the request." },
  407: { name: "Proxy Authentication Required", detail: "The client must first authenticate itself with the proxy." },
  408: { name: "Request Timeout", detail: "The server timed out waiting for the request. According to W3 HTTP specifications: \"The client did not produce a request within the time that the server was prepared to wait. The client MAY repeat the request without modifications at any later time.\"\\" },
  409: { name: "Conflict", detail: "Indicates that the request could not be processed because of conflict in the request, such as an edit conflict." },
  410: { name: "Gone", detail: "Indicates that the resource requested is no longer available and will not be available again. This should be used when a resource has been intentionally removed and the resource should be purged. Upon receiving a 410 status code, the client should not request the resource again in the future. Clients such as search engines should remove the resource from their indices. Most use cases do not require clients and search engines to purge the resource, and a \"404 Not Found\" may be used instead.\\" },
  411: { name: "Length Required", detail: "The request did not specify the length of its content, which is required by the requested resource." },
  412: { name: "Precondition Failed", detail: "The server does not meet one of the preconditions that the requester put on the request." },
  413: { name: "Request Entity Too Large", detail: "The request is larger than the server is willing or able to process." },
  414: { name: "Request-URI Too Long", detail: "The URI provided was too long for the server to process." },
  415: { name: "Unsupported Media Type", detail: "The request entity has a media type which the server or resource does not support. For example, the client uploads an image as image/svg+xml, but the server requires that images use a different format." },
  416: { name: "Requested Range Not Satisfiable", detail: "The client has asked for a portion of the file, but the server cannot supply that portion. For example, if the client asked for a part of the file that lies beyond the end of the file." },
  417: { name: "Expectation Failed", detail: "The server cannot meet the requirements of the Expect request-header field." },
  418: { name: "I'm a teapot (RFC 2324)", detail: "This code was defined in 1998 as one of the traditional IETF April Fools' jokes, in RFC 2324, Hyper Text Coffee Pot Control Protocol, and is not expected to be implemented by actual HTTP servers. However, known implementations do exist." },
  422: { name: "Unprocessable Entity (WebDAV) (RFC 4918)", detail: "The request was well-formed but was unable to be followed due to semantic errors." },
  423: { name: "Locked (WebDAV) (RFC 4918)", detail: "The resource that is being accessed is locked." },
  424: { name: "Failed Dependency (WebDAV) (RFC 4918)", detail: "The request failed due to failure of a previous request (e.g. a PROPPATCH)." },
  425: { name: "Unordered Collection (RFC 3648)", detail: "Defined in drafts of \"WebDAV Advanced Collections Protocol\",[14] but not present in \"Web Distributed Authoring and Versioning (WebDAV) Ordered Collections Protocol\".[15]\\" },
  426: { name: "Upgrade Required (RFC 2817)", detail: "The client should switch to a different protocol such as TLS/1.0." },
  428: { name: "Precondition Required", detail: "The origin server requires the request to be conditional. Intended to prevent \\\"the 'lost update' problem, where a client GETs a resource's state, modifies it, and PUTs it back to the server, when meanwhile a third party has modified the state on the server, leading to a conflict.\\\"[17] Proposed in an Internet-Draft." },
  429: { name: "Too Many Requests", detail: "The user has sent too many requests in a given amount of time. Intended for use with rate limiting schemes. Proposed in an Internet-Draft." },
  431: { name: "Request Header Fields Too Large", detail: "The server is unwilling to process the request because either an individual header field, or all the header fields collectively, are too large. Proposed in an Internet-Draft." },
  444: { name: "No Response", detail: "An nginx HTTP server extension. The server returns no information to the client and closes the connection (useful as a deterrent for malware)." },
  449: { name: "Retry With", detail: "A Microsoft extension. The request should be retried after performing the appropriate action." },
  450: { name: "Blocked by Windows Parental Controls", detail: "A Microsoft extension. This error is given when Windows Parental Controls are turned on and are blocking access to the given webpage." },
  451: { name: "Unavailable For Legal Reasons", detail: "The server is denying access to the resource as a consequence of a legal demand (e.g. censorship or government-mandated blocking)." },
  499: { name: "Client Closed Request", detail: "An Nginx HTTP server extension. This code is introduced to log the case when the connection is closed by client while HTTP server is processing its request, making server unable to send the HTTP header back." },
  500: { name: "Internal Server Error", detail: "A generic error message, given when no more specific message is suitable." },
  501: { name: "Not Implemented", detail: "The server either does not recognise the request method, or it lacks the ability to fulfill the request." },
  502: { name: "Bad Gateway", detail: "The server was acting as a gateway or proxy and received an invalid response from the upstream server." },
  503: { name: "Service Unavailable", detail: "The server is currently unavailable (because it is overloaded or down for maintenance). Generally, this is a temporary state." },
  504: { name: "Gateway Timeout", detail: "The server was acting as a gateway or proxy and did not receive a timely response from the upstream server." },
  505: { name: "HTTP Version Not Supported", detail: "The server does not support the HTTP protocol version used in the request." },
  506: { name: "Variant Also Negotiates (RFC 2295)", detail: "Transparent content negotiation for the request results in a circular reference.[21]" },
  507: { name: "Insufficient Storage (WebDAV) (RFC 4918)", detail: "The server is unable to store the representation needed to complete the request." },
  508: { name: "Loop Detected (WebDAV) (RFC 5842)", detail: "The server detected an infinite loop while processing the request (sent in lieu of 208)." },
  509: { name: "Bandwidth Limit Exceeded (Apache bw/limited extension)", detail: "This status code, while used by many servers, is not specified in any RFCs." },
  510: { name: "Not Extended (RFC 2774)", detail: "Further extensions to the request are required for the server to fulfill it.[22]" },
  511: { name: "Network Authentication Required", detail: "The client needs to authenticate to gain network access. Intended for use by intercepting proxies used to control access to the network (e.g. \"captive portals\" used to require agreement to Terms of Service before granting full Internet access via a Wi-Fi hotspot). Proposed in an Internet-Draft.\\" },
  598: { name: "Network read timeout error", detail: "This status code is not specified in any RFCs, but is used by some HTTP proxies to signal a network read timeout behind the proxy to a client in front of the proxy." },
  599: { name: "Network connect timeout error[23]", detail: "This status code is not specified in any RFCs, but is used by some HTTP proxies to signal a network connect timeout behind the proxy to a client in front of the proxy." },
}

const ZH: Record<number, StatusInfo> = {
  100: { name: "继续", detail: "一切正常。请继续发送请求" },
  101: { name: "切换协议", detail: "收到升级连接的请求。正在切换协议" },
  102: { name: "处理中", detail: "正在处理响应。尚无可用响应" },
  103: { name: "早期提示", detail: "该状态码指示客户端在服务器准备响应时预加载资源" },
  122: { name: "请求 URI 过长", detail: "URI 超过了最大 2083 个字符。这是 Internet Explorer 特有的非官方状态码" },
  200: { name: "成功", detail: "请求成功。服务器已按要求响应" },
  201: { name: "已创建", detail: "已成功创建新资源" },
  202: { name: "已接受", detail: "请求已收到，但尚未处理" },
  203: { name: "非权威信息", detail: "返回的元数据与源服务器不完全一致，而是来自本地或第三方副本" },
  204: { name: "无内容", detail: "此请求除请求头外无其他内容可返回" },
  205: { name: "重置内容", detail: "重置发送此请求的文档" },
  206: { name: "部分内容", detail: "按照 Range 请求头，已接收部分资源" },
  207: { name: "多状态", detail: "这种情况需要多个状态码，一个不够" },
  208: { name: "已报告", detail: "用于 dav:propstat 响应元素中，避免重复枚举同一集合的多个绑定的内部成员" },
  226: { name: "增量内容", detail: "服务器已完成对该资源的 GET 请求，响应表示对当前实例应用一个或多个实例操作的结果" },
  300: { name: "多种选择", detail: "此请求有多个可能的响应" },
  301: { name: "永久重定向", detail: "请求资源的 URL 已永久更改，新的 URL 会在响应中返回" },
  302: { name: "临时重定向", detail: "请求资源的 URL 暂时更改。请在将来请求时继续使用当前 URL" },
  303: { name: "参见其他位置", detail: "已重定向到请求资源的其他 URL" },
  304: { name: "使用缓存", detail: "响应未被修改。继续使用相同的缓存版本" },
  305: { name: "使用代理", detail: "许多 HTTP 客户端（如 Mozilla 和 Internet Explorer）由于安全原因，无法正确处理带有此状态码的响应" },
  306: { name: "切换代理", detail: "后续请求应使用指定的代理。这是一个保留且未使用的状态码" },
  307: { name: "临时重定向", detail: "该资源暂时可在不同的 URL 获取。请使用相同的方法请求新 URL。与 302 不同，307 保证在后续的 HTTP 请求中，HTTP 方法和请求体不会改变" },
  308: { name: "永久重定向", detail: "该资源已永久移动到不同的 URL。请使用相同的方法请求新 URL。与 301 不同，308 保证在后续的 HTTP 请求中，HTTP 方法和请求体不会改变" },
  400: { name: "请求有误", detail: "服务器无法理解请求，因为请求格式无效或语法错误" },
  401: { name: "未认证", detail: "请求未通过身份认证，因为客户端未提供鉴权凭证或提供了错误的凭证" },
  402: { name: "需要付款", detail: "访问所请求的资源需要付费" },
  403: { name: "权限不足", detail: "尽管客户端提供了有效的鉴权凭证，但无权访问该资源，因此被禁止访问" },
  404: { name: "未找到", detail: "找不到请求的资源" },
  405: { name: "方法不允许", detail: "该资源不允许使用此请求方法" },
  406: { name: "不可接受", detail: "服务器在进行“服务器驱动的内容协商”后，找不到任何相关内容" },
  407: { name: "需要代理认证", detail: "请求未通过身份认证" },
  408: { name: "请求超时", detail: "处理请求花费时间过长，连接已终止" },
  409: { name: "冲突", detail: "请求与服务器当前状态冲突，无法处理" },
  410: { name: "已删除", detail: "请求的内容已从服务器永久删除" },
  411: { name: "需要指定长度", detail: "请求无法处理，因为缺少必需的 Content-Length 请求头" },
  412: { name: "前提条件失败", detail: "服务器未满足请求头中设定的条件" },
  413: { name: "请求体过大", detail: "请求内容过大，服务器无法处理" },
  414: { name: "URI 过长", detail: "URI 过长，服务器无法处理" },
  415: { name: "不支持的媒体类型", detail: "服务器不支持请求数据的媒体格式" },
  416: { name: "无法满足请求范围", detail: "请求中 Range 请求头指定的范围无法满足，可能超出了目标 URI 的数据大小" },
  417: { name: "未满足期望", detail: "无法满足 Expect 请求头字段所指示的期望" },
  418: { name: "我是茶壶", detail: "服务器拒绝了煮咖啡的请求" },
  419: { name: "页面已过期", detail: "跨站请求伪造（CSRF）验证失败。这是 Laravel 特有的非官方状态码" },
  420: { name: "请冷静", detail: "客户端因请求过多被限流。这是 Twitter 特有的非官方状态码" },
  421: { name: "错误定向的请求", detail: "请求被发送到无法返回响应的服务器" },
  422: { name: "无法处理的实体", detail: "请求格式正确，但存在语义错误" },
  423: { name: "已锁定", detail: "请求的资源已被锁定" },
  424: { name: "依赖失败", detail: "由于先前请求失败，本次请求也失败了" },
  425: { name: "时机过早", detail: "服务器不愿冒险处理可能被重放的请求" },
  426: { name: "需要升级", detail: "当前协议无法处理请求。请查看 Upgrade 响应头以了解支持的协议" },
  428: { name: "需要前提条件", detail: "源服务器要求请求为条件请求，以防止冲突" },
  429: { name: "请求过多", detail: "由于在短时间内发送了太多请求，无法处理该请求" },
  431: { name: "请求头字段过大", detail: "请求头信息太大，服务器无法处理" },
  444: { name: "无响应", detail: "服务器不向客户端返回任何信息并关闭连接（可用于防止恶意软件）。这是 Nginx 特有的非官方状态码" },
  449: { name: "请重试", detail: "请求无法处理，因为缺少所需信息。这是 Microsoft IIS 特有的非官方状态码" },
  450: { name: "被 Windows 家长控制阻止", detail: "家长控制已阻止访问该资源。这是 Microsoft 特有的非官方状态码" },
  451: { name: "因法律原因不可用", detail: "请求的资源因法律原因无法提供" },
  460: { name: "客户端过早关闭连接", detail: "连接在超时之前已关闭。这是 AWS ELB 特有的非官方状态码" },
  463: { name: "转发的 IP 地址过多", detail: "X-Forwarded-For 请求头包含过多 IP 地址。这是 AWS ELB 特有的非官方状态码" },
  464: { name: "协议不兼容", detail: "HTTP 请求协议不兼容。这是 AWS ELB 特有的非官方状态码" },
  494: { name: "请求头过大", detail: "请求或某些请求头太大，无法处理。这是 Nginx 特有的非官方状态码" },
  495: { name: "SSL 证书错误", detail: "无法验证客户端证书。这是 Nginx 特有的非官方状态码" },
  496: { name: "需要 SSL 证书", detail: "缺少客户端证书。这是 Nginx 特有的非官方状态码" },
  497: { name: "HTTP 请求发送到 HTTPS 端口", detail: "向安全（HTTPS）端口发送了不安全（HTTP）的请求。这是 Nginx 特有的非官方状态码" },
  498: { name: "无效令牌", detail: "认证令牌无效。这是 Esri 特有的非官方状态码" },
  499: { name: "客户端关闭请求", detail: "服务器完成任务前连接已关闭。这是 Nginx 特有的非官方状态码" },
  500: { name: "服务器内部错误", detail: "服务器遇到无法处理的情况" },
  501: { name: "未实现", detail: "服务器不支持该请求方法，因此无法处理" },
  502: { name: "网关错误", detail: "服务器作为网关时收到了无效响应" },
  503: { name: "服务不可用", detail: "服务器已宕机（可能正在维护或过载）" },
  504: { name: "网关超时", detail: "服务器作为网关时未及时收到响应" },
  505: { name: "HTTP 版本不受支持", detail: "服务器不支持请求中使用的 HTTP 版本" },
  506: { name: "变体也在协商", detail: "变体也在协商" },
  507: { name: "存储空间不足", detail: "存储空间不足" },
  508: { name: "检测到循环", detail: "检测到循环" },
  509: { name: "超出带宽限制", detail: "超出带宽限制" },
  510: { name: "未扩展", detail: "未扩展" },
  511: { name: "需要网络认证", detail: "需要网络认证" },
  520: { name: "Web 服务器返回未知错误", detail: "Web 服务器返回未知错误" },
  521: { name: "Web 服务器已宕机", detail: "Web 服务器已宕机" },
  522: { name: "连接超时", detail: "连接超时" },
  523: { name: "源站不可达", detail: "源站不可达" },
  524: { name: "发生超时", detail: "发生超时" },
  525: { name: "SSL 握手失败", detail: "SSL 握手失败" },
  526: { name: "无效 SSL 证书", detail: "无效 SSL 证书" },
  527: { name: "Railgun 监听源站", detail: "Railgun 监听源站" },
  529: { name: "服务过载", detail: "服务过载" },
  530: { name: "站点被冻结", detail: "站点被冻结" },
  561: { name: "未授权", detail: "未授权" },
  598: { name: "网络读取超时错误", detail: "网络读取超时错误" },
  599: { name: "网络连接超时错误", detail: "网络连接超时错误" },
}

export type StatusClass =
  | "informational" | "success" | "redirect" | "clientError" | "serverError" | "unknown"

/** 按首位数字判断状态码类别。 */
export function statusClass(code: number): StatusClass {
  if (code >= 100 && code < 200) return "informational"
  if (code >= 200 && code < 300) return "success"
  if (code >= 300 && code < 400) return "redirect"
  if (code >= 400 && code < 500) return "clientError"
  if (code >= 500 && code < 600) return "serverError"
  return "unknown"
}

/**
 * 取状态码释义，随当前界面语言返回对应语种；
 * 当前语种缺该码时回退到另一语种，仍无则返回 undefined。
 * 读取 language() 信号，故在响应式作用域中会随语言切换自动更新。
 */
export function getStatusInfo(code: number): StatusInfo | undefined {
  const primary = language() === "zh-CN" ? ZH : EN
  const fallback = primary === ZH ? EN : ZH
  return primary[code] ?? fallback[code]
}
