package server

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
)

type Server struct {
	httpServer                  http.Server
	uek                         *uek.Client
	logger                      *slog.Logger
	bufferPool                  sync.Pool
	staticAssetPathToMetadata   map[string]staticAssetMetadata
	staticAssetPathToMetadataMu sync.RWMutex
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
		bufferPool: sync.Pool{
			New: func() any {
				buff := make([]byte, 32*1024)
				return &buff
			},
		},
		staticAssetPathToMetadata: map[string]staticAssetMetadata{},
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
