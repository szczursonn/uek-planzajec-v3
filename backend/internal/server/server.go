package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"time"

	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
)

type Server struct {
	httpServer http.Server
	uek        *uek.Client
	logger     *slog.Logger
}

func New(addr string, uek *uek.Client, logger *slog.Logger) (*Server, error) {
	mux := http.NewServeMux()
	srv := &Server{
		httpServer: http.Server{
			Addr:              addr,
			ReadHeaderTimeout: 10 * time.Second,
			WriteTimeout:      30 * time.Second,
			IdleTimeout:       60 * time.Second,
			Handler:           mux,
			ErrorLog:          slog.NewLogLogger(logger.With(slog.String("source", "http.Server")).Handler(), slog.LevelError),
		},
		uek:    uek,
		logger: logger,
	}

	if err := registerStaticRoutes(mux); err != nil {
		return nil, err
	}

	mux.HandleFunc("GET /api/", appVersionMiddleware(func(w http.ResponseWriter, r *http.Request) {
		respondNotFound(w)
	}))
	mux.HandleFunc("GET /api/groupings", appVersionMiddleware(srv.debugLoggingMiddleware(srv.handleGroupings)))
	mux.HandleFunc("GET /api/headers", appVersionMiddleware(srv.debugLoggingMiddleware(srv.handleHeaders)))
	mux.HandleFunc("GET /api/aggregateSchedule", appVersionMiddleware(srv.debugLoggingMiddleware(srv.handleAggregateSchedule)))
	mux.HandleFunc("GET /api/ical/{payload}", appVersionMiddleware(srv.debugLoggingMiddleware(srv.handleICal)))

	return srv, nil
}

func (srv *Server) Run() error {
	if err := srv.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	return nil
}

func (srv *Server) Shutdown(ctx context.Context) error {
	return srv.httpServer.Shutdown(ctx)
}

func respondJSON(w http.ResponseWriter, val any) {
	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(val)
}

func respondNotFound(w http.ResponseWriter) {
	http.Error(w, "Not Found", http.StatusNotFound)
}

func respondBadRequest(w http.ResponseWriter) {
	http.Error(w, "Bad Request", http.StatusBadRequest)
}

func respondBadGateway(w http.ResponseWriter) {
	http.Error(w, "Bad Gateway", http.StatusBadGateway)
}

func setCacheHeader(w http.ResponseWriter, expirationDate time.Time) {
	maxAge := int(math.Ceil(time.Until(expirationDate).Seconds()))
	if maxAge > 0 {
		w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", maxAge))
	}
}
