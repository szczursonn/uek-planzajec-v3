package env

import (
	"time"

	"github.com/joho/godotenv"
)

func LoadDotEnv() {
	godotenv.Overload()
}

const envPrefix = "UEKPZ3_"

func GetIsDebug() bool {
	const envKey = envPrefix + "DEBUG"
	return getEnvBoolWithDefault(envKey, false)
}

func GetServerAddr() string {
	const envKey = envPrefix + "ADDR"
	value := getEnvString(envKey)
	if value == "" {
		return ":3001"
	}

	return value
}

func GetCacheTimeGroupings() time.Duration {
	const envKey = envPrefix + "CACHE_GROUPINGS"
	value := getEnvDuration(envKey)
	if value <= 0 {
		return 2 * time.Hour
	}

	return value
}

func GetCacheTimeHeaders() time.Duration {
	const envKey = envPrefix + "CACHE_HEADERS"
	value := getEnvDuration(envKey)
	if value <= 0 {
		return 2 * time.Hour
	}

	return value
}

func GetCacheTimeSchedules() time.Duration {
	const envKey = envPrefix + "CACHE_SCHEDULES"
	value := getEnvDuration(envKey)
	if value <= 0 {
		return 15 * time.Minute
	}

	return value
}

func GetCacheTimePeriods() time.Duration {
	const envKey = envPrefix + "CACHE_PERIODS"
	value := getEnvDuration(envKey)
	if value <= 0 {
		return 2 * time.Hour
	}

	return value
}

func GetSqliteCachePath() string {
	const envKey = envPrefix + "CACHE_SQLITE_PATH"
	return getEnvString(envKey)
}

func GetIsMock() bool {
	const envKey = envPrefix + "MOCK"
	return getEnvBoolWithDefault(envKey, false)
}

func GetIsMockPassthrough() bool {
	const envKey = envPrefix + "MOCK_PASSTHROUGH"
	return getEnvBoolWithDefault(envKey, true)
}

func GetMockDelay() time.Duration {
	const envKey = envPrefix + "MOCK_DELAY"
	return getEnvDuration(envKey)
}
