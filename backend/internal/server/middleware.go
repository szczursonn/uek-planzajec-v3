package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

func (srv *Server) debugLoggingMiddleware(handler http.HandlerFunc) http.HandlerFunc {
	if !srv.logger.Enabled(context.Background(), slog.LevelDebug) {
		return handler
	}

	return func(w http.ResponseWriter, r *http.Request) {
		startTime := time.Now()
		handler(w, r)
		srv.logger.DebugContext(r.Context(), "Request handled", slog.String("url", r.URL.String()), slog.String("proto", r.Proto), slog.String("sourceIp", r.RemoteAddr), slog.String("timeTaken", time.Since(startTime).String()))
	}
}
