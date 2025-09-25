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

	"github.com/szczursonn/uek-planzajec-v3/internal/env"
	"github.com/szczursonn/uek-planzajec-v3/internal/server"
	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
	"github.com/szczursonn/uek-planzajec-v3/internal/uekmock"
	"github.com/szczursonn/uek-planzajec-v3/internal/ueksqlitecache"
)

func main() {
	os.Exit(run())
}

func run() int {
	env.LoadDotEnv()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: func() slog.Level {
			if env.GetIsDebug() {
				return slog.LevelDebug
			}
			return slog.LevelInfo
		}(),
	}))
	slog.SetDefault(logger)

	mockDownloadUrl := ""
	flag.StringVar(&mockDownloadUrl, "mockdl", "", "")
	flag.Parse()
	mockDownloadUrl = strings.TrimSpace(mockDownloadUrl)

	if mockDownloadUrl != "" {
		return runMockDownload(logger, mockDownloadUrl)
	}

	return runServer(logger)
}

func runMockDownload(logger *slog.Logger, downloadUrl string) int {
	ctx, cancelCtx := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancelCtx()

	logger.Info("Downloading mock response...", slog.String("downloadUrl", downloadUrl))

	if err := uekmock.DownloadResponse(ctx, downloadUrl); err != nil {
		logger.Error("Failed to download mock response", slog.Any("err", err))
		return 1
	}
	logger.Info("Done!")

	return 0
}

func runServer(logger *slog.Logger) int {
	uekClientConfig := uek.ClientConfig{
		CacheTimeGroupings: env.GetCacheTimeGroupings(),
		CacheTimeHeaders:   env.GetCacheTimeHeaders(),
		CacheTimeSchedules: env.GetCacheTimeSchedules(),
		CacheTimePeriods:   env.GetCacheTimePeriods(),
	}

	sqliteCachePath := env.GetSqliteCachePath()
	if sqliteCachePath != "" {
		sqliteCache, err := ueksqlitecache.New(context.Background(), sqliteCachePath, logger.With("source", "sqliteCache"))
		if err != nil {
			logger.Error("Failed to set up sqlite cache", slog.Any("err", err))
		} else {
			defer sqliteCache.Close()
			uekClientConfig.Cache = sqliteCache
		}
	}

	if env.GetIsMock() {
		uekClientConfig.HttpClient = &http.Client{
			Transport: uekmock.RoundTripper(env.GetIsMockPassthrough(), env.GetMockDelay()),
		}
	}

	uekClient, err := uek.NewClient(uekClientConfig)
	if err != nil {
		logger.Error("Failed to initialize uek client", slog.Any("err", err))
		return 1
	}

	serverAddr := env.GetServerAddr()

	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt)

	srv := server.New(serverAddr, uekClient, logger)
	go func() {
		logger.Info("Server started",
			slog.String("addr", serverAddr),
			slog.String("sqliteCachePath", sqliteCachePath),
			slog.Group("cacheTimes", slog.String("groupings", uekClientConfig.CacheTimeGroupings.String()), slog.String("headers", uekClientConfig.CacheTimeHeaders.String()), slog.String("schedules", uekClientConfig.CacheTimeSchedules.String()), slog.String("periods", uekClientConfig.CacheTimePeriods.String())),
		)
		if err := srv.Run(); err != nil {
			logger.Error("Server stopped unexpectedly", slog.Any("err", err))
		}
		select {
		case signalChan <- nil:
		default:
		}
	}()

	<-signalChan
	signal.Stop(signalChan)
	logger.Info("Shutting down...")

	shutdownCtx, cancelShutdownCtx := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdownCtx()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("Failed to shut down gracefully", slog.Any("err", err))
		return 1
	}

	logger.Info("Shut down gracefully")

	return 0
}
