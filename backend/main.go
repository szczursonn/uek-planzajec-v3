package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"time"

	_ "time/tzdata"

	"github.com/joho/godotenv"
	"github.com/szczursonn/uek-planzajec-v3/internal/server"
	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
	"github.com/szczursonn/uek-planzajec-v3/internal/version"
)

const EnvPrefix = "UEKPZ3_"

const (
	EnvKeyPort                = "PORT"
	EnvKeyDebugLogging        = "LOG_DEBUG"
	EnvKeyPeriodCurrentYearId = "PERIOD_CURRENT"
	EnvKeyPeriodLastYearId    = "PERIOD_LAST"
	EnvKeyCacheTimeGroupings  = "CACHE_GROUPINGS"
	EnvKeyCacheTimeHeaders    = "CACHE_HEADERS"
	EnvKeyCacheTimeSchedules  = "CACHE_SCHEDULES"
)

const DefaultPort = 3001

func getEnv(key string) string {
	return strings.TrimSpace(os.Getenv(EnvPrefix + key))
}

func getEnvBool(key string, defaultValue bool) bool {
	value, err := strconv.ParseBool(getEnv(key))
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvInt(key string, defaultValue int) int {
	value, err := strconv.Atoi(getEnv(key))
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvSecondsDuration(key string) time.Duration {
	return time.Duration(max(getEnvInt(key, 0), 0)) * time.Second
}

func main() {
	// Config
	godotenv.Overload()

	logLevel := slog.LevelInfo
	if getEnvBool(EnvKeyDebugLogging, false) {
		logLevel = slog.LevelDebug
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	}))
	slog.SetDefault(logger)

	port := getEnvInt(EnvKeyPort, DefaultPort)

	currentYearPeriodId := getEnvInt(EnvKeyPeriodCurrentYearId, -1)
	if currentYearPeriodId < 0 {
		logger.Error("Missing or invalid current year period")
		return
	}

	lastYearPeriodId := getEnvInt(EnvKeyPeriodLastYearId, -1)
	if lastYearPeriodId < 0 {
		logger.Error("Missing or invalid current year period")
		return
	}

	cacheTimeGroupings := getEnvSecondsDuration(EnvKeyCacheTimeGroupings)
	cacheTimeHeaders := getEnvSecondsDuration(EnvKeyCacheTimeHeaders)
	cacheTimeSchedules := getEnvSecondsDuration(EnvKeyCacheTimeSchedules)

	uekClient := uek.NewClient(uek.ClientConfig{
		CacheTimeGroupings:  cacheTimeGroupings,
		CacheTimeHeaders:    cacheTimeHeaders,
		CacheTimeSchedules:  cacheTimeSchedules,
		CurrentYearPeriodId: currentYearPeriodId,
		LastYearPeriodId:    lastYearPeriodId,
	})

	// Run
	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt)

	logger.Info("Starting server...", slog.Int("port", port), slog.Group("version", slog.String("app", version.AppVersion), slog.String("go", version.GoVersion)), slog.Group("periodId", slog.Int("currentYear", currentYearPeriodId), slog.Int("lastYear", lastYearPeriodId)), slog.Group("cacheTimes", slog.Float64("groupings", cacheTimeGroupings.Seconds()), slog.Float64("headers", cacheTimeHeaders.Seconds()), slog.Float64("schedules", cacheTimeSchedules.Seconds())))
	srv, err := server.New(fmt.Sprintf(":%d", port), uekClient, logger)
	if err != nil {
		logger.Error("Failed to start server", slog.Any("err", err))
	}

	go func() {
		logger.Info("Server is running")
		if err := srv.Run(); err != nil {
			logger.Error("Server stopped unexpectedly", slog.Any("err", err))
		}
		signalChan <- nil
	}()

	<-signalChan
	signal.Stop(signalChan)
	logger.Info("Shutting down...")

	shutdownCtx, cancelShutdownCtx := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdownCtx()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("Failed to shut down gracefully", slog.Any("err", err))
	}
	logger.Info("Shut down gracefully")
}
