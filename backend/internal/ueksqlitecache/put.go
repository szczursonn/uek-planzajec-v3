package ueksqlitecache

import (
	"bytes"
	"encoding/gob"
	"log/slog"
	"time"

	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
)

func (c *Cache) PutGroupingsAndPeriods(cacheExpirationDateGroupings time.Time, groupings *uek.Groupings, cacheExpirationDatePeriods time.Time, periods []uek.SchedulePeriod) {
	put(c, groupingsKey, groupings, cacheExpirationDateGroupings)
	put(c, periodsKey, periods, cacheExpirationDatePeriods)
}

func (c *Cache) PutHeaders(cacheExpirationDate time.Time, scheduleType uek.ScheduleType, groupingName string, headers []uek.ScheduleHeader) {
	put(c, headersKey(scheduleType, groupingName), headers, cacheExpirationDate)
}

func (c *Cache) PutScheduleAndPeriods(cacheExpirationDateSchedule time.Time, scheduleType uek.ScheduleType, scheduleId int, periodId int, schedule *uek.Schedule, cacheExpirationDatePeriods time.Time, periods []uek.SchedulePeriod) {
	put(c, scheduleKey(scheduleType, scheduleId, periodId), schedule, cacheExpirationDateSchedule)
	put(c, periodsKey, periods, cacheExpirationDatePeriods)
}

func put[T any](c *Cache, key string, value T, expirationDate time.Time) {
	buff := &bytes.Buffer{}
	if err := gob.NewEncoder(buff).Encode(value); err != nil {
		c.logger.Error("Failed to encode value", slog.String("key", key), slog.Any("err", err))
		return
	}

	if _, err := c.upsertStmt.Exec(key, buff.Bytes(), expirationDate.Unix()); err != nil {
		c.logger.Error("Failed to execute upsert", slog.String("key", key), slog.Any("err", err))
		return
	}

	c.logger.Debug("Cache put", slog.String("key", key))
}
