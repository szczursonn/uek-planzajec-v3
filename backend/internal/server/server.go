package server

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
)

type Server struct {
	httpServer http.Server
	uek        *uek.Client
	logger     *slog.Logger
}

func New(addr string, uek *uek.Client, logger *slog.Logger) *Server {
	// enable h2c
	protocols := &http.Protocols{}
	protocols.SetHTTP1(true)
	protocols.SetUnencryptedHTTP2(true)

	srv := &Server{
		httpServer: http.Server{
			Addr:              addr,
			ReadHeaderTimeout: 15 * time.Second,
			WriteTimeout:      45 * time.Second,
			IdleTimeout:       time.Minute,
			Handler:           http.NewServeMux(),
			Protocols:         protocols,
			ErrorLog:          slog.NewLogLogger(logger.With(slog.String("source", "http.Server")).Handler(), slog.LevelError),
		},
		uek:    uek,
		logger: logger,
	}

	srv.registerStaticRoutes()
	srv.registerAPIRoutes()

	return srv
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
