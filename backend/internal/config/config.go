package config

import (
	"time"
)

type Config struct {
	Debug       bool
	Addr        string
	Mock        Mock
	CacheTimes  CacheTimes
	SqliteCache SqliteCache
}

type Mock struct {
	Enabled       bool
	Passthrough   bool
	Delay         time.Duration
	DirectoryPath string
}

type CacheTimes struct {
	Groupings time.Duration
	Headers   time.Duration
	Schedules time.Duration
	Periods   time.Duration
}

type SqliteCache struct {
	Enabled bool
	Path    string
}

func FromEnv() Config {
	return Config{
		Debug: getEnvBoolWithDefault("DEBUG", false),
		Addr:  getEnvStringWithDefault("ADDR", ":3001"),
		Mock: Mock{
			Enabled:       getEnvBoolWithDefault("MOCK", false),
			Passthrough:   getEnvBoolWithDefault("MOCK_PASSTHROUGH", true),
			Delay:         getEnvDurationWithDefault("MOCK_DELAY", time.Second),
			DirectoryPath: getEnvStringWithDefault("MOCK_DIR", "./mock"),
		},
		CacheTimes: CacheTimes{
			Groupings: getEnvDurationWithDefault("CACHETIME_GROUPINGS", time.Hour),
			Headers:   getEnvDurationWithDefault("CACHETIME_HEADERS", time.Hour),
			Schedules: getEnvDurationWithDefault("CACHETIME_SCHEDULES", 15*time.Minute),
			Periods:   getEnvDurationWithDefault("CACHETIME_PERIODS", time.Hour),
		},
		SqliteCache: SqliteCache{
			Enabled: getEnvBoolWithDefault("SQLITE_CACHE_ENABLED", false),
			Path:    getEnvString("SQLITE_CACHE_PATH"),
		},
	}
}
