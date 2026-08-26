// Package crashreport 用一个运行标记判断上次是否异常退出。
package crashreport

import (
	"os"
	"path/filepath"
	"strconv"
)

// markerName 是数据目录下的运行标记文件名。
const markerName = "running.marker"

// Mark 记录「应用正在运行」，并返回上次是否异常退出。
//
// 无服务端应用崩溃后是彻底沉默的：没有监控、没有上报，用户下次打开一切如常，
// 只会记得「它有时候会突然没了」，而你永远看不到。标记文件让崩溃至少留下痕迹：
// 正常退出时 Clear 会删掉它，下次启动还看见它，就说明上次是崩的。
func Mark(dataDir string) (bool, error) {
	path := filepath.Join(dataDir, markerName)
	_, statErr := os.Stat(path)
	crashed := statErr == nil

	if err := os.WriteFile(path, []byte(pidLine()), 0o600); err != nil {
		return crashed, err
	}
	return crashed, nil
}

// Clear 清除运行标记，表示这次是正常退出。
func Clear(dataDir string) error {
	err := os.Remove(filepath.Join(dataDir, markerName))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

// pidLine 返回写入标记文件的内容：记下本次进程的 PID，便于在日志里把两次运行对上。
func pidLine() string {
	return "pid=" + strconv.Itoa(os.Getpid()) + "\n"
}
