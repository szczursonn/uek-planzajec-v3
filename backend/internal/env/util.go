package env

import (
	"os"
	"strconv"
	"strings"
	"time"
)

func getEnvString(key string) string {
	return strings.TrimSpace(os.Getenv(key))
}

func getEnvBoolWithDefault(key string, defaultValue bool) bool {
	value, err := strconv.ParseBool(getEnvString(key))
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvInt(key string) int {
	value, _ := strconv.Atoi(getEnvString(key))
	return value
}

func getEnvDuration(key string) time.Duration {
	value, _ := time.ParseDuration(getEnvString(key))
	return value
}
