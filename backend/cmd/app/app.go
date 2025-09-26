package main

import (
	"context"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"
	_ "time/tzdata"

	"github.com/joho/godotenv"
	"github.com/szczursonn/uek-planzajec-v3/internal/config"
	"github.com/szczursonn/uek-planzajec-v3/internal/server"
	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
	"github.com/szczursonn/uek-planzajec-v3/internal/uekmock"
	"github.com/szczursonn/uek-planzajec-v3/internal/ueksqlitecache"
)

func main() {
	os.Exit(run())
}

func run() int {
	godotenv.Overload()
	cfg := config.FromEnv()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: func() slog.Level {
			if cfg.Debug {
				return slog.LevelDebug
			}
			return slog.LevelInfo
		}(),
	}))
	slog.SetDefault(logger)

	mockDownloadUrl := ""
	flag.StringVar(&mockDownloadUrl, "mockdl", "", "url to download mock data from")
	flag.Parse()
	mockDownloadUrl = strings.TrimSpace(mockDownloadUrl)

	ctx, cancelCtx := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancelCtx()

	go func() {
		// ensure subsequent interrupts kill app immediately
		<-ctx.Done()
		cancelCtx()
		logger.Info("Shutting down...")
	}()

	if mockDownloadUrl != "" {
		logger.Info("Downloading mock response...", slog.String("downloadUrl", mockDownloadUrl))

		if err := uekmock.DownloadResponse(ctx, cfg.Mock.DirectoryPath, mockDownloadUrl); err != nil {
			logger.Error("Failed to download mock response", slog.Any("err", err))
			return 1
		}
		logger.Info("Done!")

		return 0
	}

	uekClientConfig := uek.ClientConfig{
		CacheTimes: cfg.CacheTimes,
	}

	effectiveSqliteCachePath := ""
	if cfg.SqliteCache.Enabled {
		sqliteLogger := logger.With("source", "sqliteCache")

		sqliteCache, err := ueksqlitecache.New(ctx, cfg.SqliteCache.Path, sqliteLogger)
		if err != nil {
			logger.Error("Failed to set up sqlite cache, falling back to in-memory cache", slog.Any("err", err))
			if sqliteCache, err = ueksqlitecache.New(ctx, ":memory:", sqliteLogger); err != nil {
				logger.Error("Failed to set up fallback in-memory sqlite cache", slog.Any("err", err))
			} else {
				effectiveSqliteCachePath = ":memory"
			}
		} else {
			effectiveSqliteCachePath = cfg.SqliteCache.Path
		}

		if err == nil {
			uekClientConfig.Cache = sqliteCache
			defer sqliteCache.Close()
		}
	}

	if cfg.Mock.Enabled {
		uekClientConfig.HttpClient = &http.Client{
			Transport: &uekmock.RoundTripper{
				Mock: cfg.Mock,
			},
		}
	}

	srv := server.New(cfg.Addr, uek.NewClient(uekClientConfig), logger)
	go func() {
		logger.Info("Server started",
			slog.Bool("debug", cfg.Debug),
			slog.String("addr", cfg.Addr),
			slog.Bool("mock", cfg.Mock.Enabled),
			slog.String("sqliteCachePath", effectiveSqliteCachePath),
		)
		if err := srv.Run(); err != nil {
			logger.Error("Server stopped unexpectedly", slog.Any("err", err))
		}
		cancelCtx()
	}()

	<-ctx.Done()

	shutdownCtx, cancelShutdownCtx := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdownCtx()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("Failed to shut down gracefully", slog.Any("err", err))
		return 1
	}

	logger.Info("Shut down gracefully")

	return 0
}
