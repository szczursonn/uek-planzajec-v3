package server

import (
	"embed"
	"errors"
	"io"
	"io/fs"
	"log/slog"
	"mime"
	"net/http"
	"path"
	"strings"
	"sync"
)

//go:embed static/*
var staticFS embed.FS

func (srv *Server) registerStaticRoutes() {
	bufferPool := sync.Pool{
		New: func() any {
			buff := make([]byte, 32*1024)
			return &buff
		},
	}

	srv.httpServer.Handler.(*http.ServeMux).HandleFunc("GET /", srv.debugLoggingMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if err := func() error {
			reqPath := r.URL.Path
			if reqPath == "/" {
				reqPath = "/index.html"
			}
			filePath := path.Join("static", reqPath)

			f, err := staticFS.Open(filePath)
			if err != nil {
				if errors.Is(err, fs.ErrNotExist) {
					respondNotFound(w)
					return nil
				}
				return err
			}
			defer f.Close()

			buff := *bufferPool.Get().(*[]byte)
			defer bufferPool.Put(&buff)

			fileExtension := path.Ext(filePath)
			contentTypeHeader := mime.TypeByExtension(fileExtension)
			if contentTypeHeader == "" && fileExtension == ".webmanifest" {
				contentTypeHeader = "application/json"
			}
			if contentTypeHeader == "" {
				n, err := io.ReadFull(f, buff)
				if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
					return err
				}
				if _, err := f.(io.Seeker).Seek(0, io.SeekStart); err != nil {
					return err
				}

				contentTypeHeader = http.DetectContentType(buff[:n])
			}

			cacheControlHeader := "no-cache"
			if strings.HasPrefix(filePath, "static/assets/") {
				cacheControlHeader = "public, immutable, max-age=31536000"
			}

			headers := w.Header()
			headers.Set("Content-Type", contentTypeHeader)
			headers.Set("Cache-Control", cacheControlHeader)

			w.WriteHeader(http.StatusOK)
			io.CopyBuffer(w, f, buff)

			return nil
		}(); err != nil {
			respondInternalServerError(w)
			srv.logger.Error("Static route error", slog.String("reqPath", r.URL.Path), slog.Any("err", err))
		}

	}))
}
