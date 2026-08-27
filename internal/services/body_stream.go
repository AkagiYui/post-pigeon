package services

import (
	"bytes"
	"io"
	"net/http"
	"os"
)

// bodySegment 是请求体的一段：要么是内存里的一截字节（分隔符、字段头、文本字段），
// 要么是磁盘上的一个文件（附件本体）。
type bodySegment struct {
	// bytes 内存段的内容；path 非空时忽略
	bytes []byte
	// path 文件段的路径
	path string
	// size 该段的字节数，用于算 Content-Length
	size int64
}

// byteSegment 构造一个内存段。
func byteSegment(b []byte) bodySegment {
	return bodySegment{bytes: b, size: int64(len(b))}
}

// fileSegment 构造一个文件段。
func fileSegment(path string, size int64) bodySegment {
	return bodySegment{path: path, size: size}
}

// bodyStream 是「由若干段拼起来、可以重复构造」的请求体。
//
// 为什么不直接拼成一个 []byte：附件可以有几百 MB，全读进内存再发一遍，内存里就有
// 两份。这里把文件段留在磁盘上，真正读到它时才打开，边读边发。
//
// 之所以要「可重复构造」，是因为 http.Request.GetBody：重定向、连接重试都要求能
// 从头再来一遍，一次性的 reader 到那时已经读空了。
type bodyStream struct {
	segments []bodySegment
}

// newBodyStream 由若干段构造请求体。
func newBodyStream(segments ...bodySegment) *bodyStream {
	return &bodyStream{segments: segments}
}

// contentLength 返回请求体总字节数。
//
// 文件段的大小取自构造时的 os.Stat：如果文件在发送途中被改小改大，实际读到的字节数
// 会和这个值对不上，标准库会以错误告终——这是流式发送的固有代价，总好过为了拿准确
// 长度先把文件整个读进内存。
func (b *bodyStream) contentLength() int64 {
	var total int64
	for _, seg := range b.segments {
		total += seg.size
	}
	return total
}

// open 构造一份新的可读请求体。每次调用都是从头开始的一份。
func (b *bodyStream) open() io.ReadCloser {
	readers := make([]io.Reader, 0, len(b.segments))
	closers := make([]io.Closer, 0, len(b.segments))
	for _, seg := range b.segments {
		if seg.path == "" {
			readers = append(readers, bytes.NewReader(seg.bytes))
			continue
		}
		lazy := &lazyFile{path: seg.path}
		readers = append(readers, lazy)
		closers = append(closers, lazy)
	}
	return &segmentedBody{reader: io.MultiReader(readers...), closers: closers}
}

// apply 把请求体挂到请求上，并设好 Content-Length 与重放用的 GetBody。
func (b *bodyStream) apply(req *http.Request) {
	req.Body = b.open()
	req.GetBody = func() (io.ReadCloser, error) { return b.open(), nil }
	req.ContentLength = b.contentLength()
}

// segmentedBody 是 open 出来的请求体：读的是拼好的 MultiReader，
// 关的时候把途中打开过的文件一并关掉。
type segmentedBody struct {
	reader  io.Reader
	closers []io.Closer
}

func (s *segmentedBody) Read(p []byte) (int, error) {
	return s.reader.Read(p)
}

// Close 关闭所有已打开的文件；有多个错误时返回第一个，但不因此跳过后面的。
func (s *segmentedBody) Close() error {
	var first error
	for _, c := range s.closers {
		if err := c.Close(); err != nil && first == nil {
			first = err
		}
	}
	return first
}

// lazyFile 直到第一次被读时才打开文件。
//
// 惰性是有意的：一次 multipart 请求可能带好几个附件，提前全部打开就要同时占着多个
// 文件句柄，而它们本来是一个接一个被读完的。
type lazyFile struct {
	path string
	file *os.File
}

func (l *lazyFile) Read(p []byte) (int, error) {
	if l.file == nil {
		file, err := os.Open(l.path)
		if err != nil {
			return 0, err
		}
		l.file = file
	}
	return l.file.Read(p)
}

func (l *lazyFile) Close() error {
	if l.file == nil {
		return nil
	}
	err := l.file.Close()
	l.file = nil
	return err
}
