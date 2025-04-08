package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/szczursonn/uek-planzajec-v3/internal/version"
)

const appVersionHeader = "x-uekpz3-version"

func (srv *Server) debugLoggingMiddleware(handler http.HandlerFunc) http.HandlerFunc {
	if !srv.logger.Enabled(context.Background(), slog.LevelDebug) {
		return handler
	}

	return func(w http.ResponseWriter, r *http.Request) {
		startTime := time.Now()
		handler(w, r)
		srv.logger.DebugContext(r.Context(), "request handled", slog.String("url", r.URL.String()), slog.Duration("time", time.Since(startTime)), slog.String("userAgent", r.Header.Get("User-Agent")), slog.String("version", r.Header.Get(appVersionHeader)))
	}
}

func appVersionMiddleware(handler http.HandlerFunc) http.HandlerFunc {
	if version.AppVersion == "" {
		return handler
	}

	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(appVersionHeader, version.AppVersion)
		handler(w, r)
	}
}
