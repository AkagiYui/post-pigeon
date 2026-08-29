package models

// WSProtocolConversionMode 控制 WebSocket 接口是否自动把 HTTP(S) 协议头
// 转换为 WS(S)。除全局外的每一级都可继承上级。
type WSProtocolConversionMode string

const (
	WSProtocolConversionInherit WSProtocolConversionMode = "inherit"
	WSProtocolConversionOn      WSProtocolConversionMode = "on"
	WSProtocolConversionOff     WSProtocolConversionMode = "off"
)

// NormalizeWSProtocolConversion 将空值和未知值收敛为 inherit。
func NormalizeWSProtocolConversion(mode string) WSProtocolConversionMode {
	switch WSProtocolConversionMode(mode) {
	case WSProtocolConversionOn, WSProtocolConversionOff:
		return WSProtocolConversionMode(mode)
	default:
		return WSProtocolConversionInherit
	}
}
