package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

func getEnvString(key string) string {
	const envPrefix = "UEKPZ3_"
	return strings.TrimSpace(os.Getenv(envPrefix + key))
}

func getEnvStringWithDefault(key string, defaultValue string) string {
	value := getEnvString(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getEnvBoolWithDefault(key string, defaultValue bool) bool {
	value, err := strconv.ParseBool(getEnvString(key))
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvDurationWithDefault(key string, defaultValue time.Duration) time.Duration {
	value, err := time.ParseDuration(getEnvString(key))
	if err != nil {
		return defaultValue
	}

	return max(value, 0)
}
