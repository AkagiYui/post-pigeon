package services

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestBodyStreamConcatenates 拼出来的内容就是各段按顺序连起来。
func TestBodyStreamConcatenates(t *testing.T) {
	path := writeTempFile(t, "中间段.txt", "FILE")
	stream := newBodyStream(
		byteSegment([]byte("HEAD")),
		fileSegment(path, 4),
		byteSegment([]byte("TAIL")),
	)

	if got := stream.contentLength(); got != 12 {
		t.Fatalf("Content-Length = %d，期望 12", got)
	}

	body := stream.open()
	content, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("读取失败: %v", err)
	}
	if err := body.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	if string(content) != "HEADFILETAIL" {
		t.Fatalf("内容 = %q", content)
	}
	if int64(len(content)) != stream.contentLength() {
		t.Fatalf("实际长度 %d 与 Content-Length %d 不符", len(content), stream.contentLength())
	}
}

// TestBodyStreamReplayable 每次 open 都是独立的一份——重定向重发时要能从头再来。
func TestBodyStreamReplayable(t *testing.T) {
	path := writeTempFile(t, "重放.txt", "DATA")
	stream := newBodyStream(fileSegment(path, 4))

	for i := 0; i < 3; i++ {
		body := stream.open()
		content, err := io.ReadAll(body)
		if err != nil {
			t.Fatalf("第 %d 次读取失败: %v", i+1, err)
		}
		_ = body.Close()
		if string(content) != "DATA" {
			t.Fatalf("第 %d 次内容 = %q", i+1, content)
		}
	}
}

// TestBodyStreamOpensFileLazily 构造时不碰磁盘，真正读到那一段才打开文件。
func TestBodyStreamOpensFileLazily(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "还不存在.bin")
	stream := newBodyStream(byteSegment([]byte("HEAD")), fileSegment(missing, 4))

	// 构造与 open 都不该失败：此时还没读到文件那一段
	body := stream.open()

	// 前 4 个字节来自内存段，仍然读得出来
	buf := make([]byte, 4)
	if _, err := io.ReadFull(body, buf); err != nil {
		t.Fatalf("读内存段失败: %v", err)
	}
	if string(buf) != "HEAD" {
		t.Fatalf("内存段 = %q", buf)
	}

	// 继续读才会去打开那个不存在的文件
	if _, err := io.ReadAll(body); err == nil {
		t.Fatal("读到不存在的文件段时应当报错")
	}
	_ = body.Close()
}

// TestBodyStreamCloseReleasesFile 关闭请求体要把途中打开的文件一并关掉。
func TestBodyStreamCloseReleasesFile(t *testing.T) {
	path := writeTempFile(t, "句柄.txt", "X")
	lazy := &lazyFile{path: path}

	// 没读过就关：不该报错，也不该有句柄
	if err := lazy.Close(); err != nil {
		t.Fatalf("未打开时关闭出错: %v", err)
	}

	buf := make([]byte, 1)
	if _, err := lazy.Read(buf); err != nil {
		t.Fatalf("读取失败: %v", err)
	}
	if lazy.file == nil {
		t.Fatal("读过之后应当持有文件句柄")
	}
	if err := lazy.Close(); err != nil {
		t.Fatalf("关闭失败: %v", err)
	}
	if lazy.file != nil {
		t.Fatal("关闭后不应再持有句柄")
	}
}

// TestBodyStreamLargeFile 大文件也能完整发出（这正是不再整个读进内存的意义）。
func TestBodyStreamLargeFile(t *testing.T) {
	const size = 4 << 20 // 4 MiB
	path := filepath.Join(t.TempDir(), "big.bin")
	if err := os.WriteFile(path, []byte(strings.Repeat("x", size)), 0o600); err != nil {
		t.Fatalf("造大文件失败: %v", err)
	}

	stream := newBodyStream(fileSegment(path, size))
	body := stream.open()
	n, err := io.Copy(io.Discard, body)
	if err != nil {
		t.Fatalf("读取失败: %v", err)
	}
	_ = body.Close()
	if n != size {
		t.Fatalf("读到 %d 字节，期望 %d", n, size)
	}
}

// TestFileFieldSegmentKeepsFileOnDisk 有路径的附件只记路径与大小，
// 内容不进内存——这正是这次改动的目的，用例把它钉住。
func TestFileFieldSegmentKeepsFileOnDisk(t *testing.T) {
	path := writeTempFile(t, "留在磁盘.txt", "0123456789")

	seg, err := fileFieldValue{FileName: "留在磁盘.txt", Path: path}.segment()
	if err != nil {
		t.Fatalf("构造段失败: %v", err)
	}
	if seg.path != path {
		t.Fatalf("段里应记下路径，实际 %q", seg.path)
	}
	if seg.bytes != nil {
		t.Fatalf("段里不该带上文件内容，实际带了 %d 字节", len(seg.bytes))
	}
	if seg.size != 10 {
		t.Fatalf("段大小 = %d，期望 10", seg.size)
	}

	// 历史数据里的内联内容没有路径可言，只能落回内存
	legacy, err := fileFieldValue{FileName: "老的.txt", Content: "aGVsbG8="}.segment()
	if err != nil {
		t.Fatalf("历史数据构造段失败: %v", err)
	}
	if legacy.path != "" || string(legacy.bytes) != "hello" {
		t.Fatalf("历史内联内容应落回内存: %+v", legacy)
	}

	// 目录不是文件，要当作读不到处理
	if _, err := (fileFieldValue{Path: t.TempDir()}).segment(); err == nil {
		t.Fatal("目录不应被当作附件")
	}
}
