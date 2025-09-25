package ueksqlitecache

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/gob"
	"errors"
	"log/slog"
	"time"

	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
)

func (c *Cache) GetGroupings(ctx context.Context) (*uek.Groupings, time.Time, bool) {
	return get[*uek.Groupings](c, ctx, groupingsKey)
}

func (c *Cache) GetHeaders(ctx context.Context, scheduleType uek.ScheduleType, groupingName string) ([]uek.ScheduleHeader, time.Time, bool) {
	return get[[]uek.ScheduleHeader](c, ctx, headersKey(scheduleType, groupingName))
}

func (c *Cache) GetSchedule(ctx context.Context, scheduleType uek.ScheduleType, scheduleId int, periodId int) (*uek.Schedule, time.Time, bool) {
	return get[*uek.Schedule](c, ctx, scheduleKey(scheduleType, scheduleId, periodId))
}

func (c *Cache) GetPeriods(ctx context.Context) ([]uek.SchedulePeriod, time.Time, bool) {
	return get[[]uek.SchedulePeriod](c, ctx, periodsKey)
}

func get[T any](c *Cache, ctx context.Context, key string) (value T, expirationDate time.Time, ok bool) {
	var buff []byte
	var unixSeconds int64
	if err := c.getStmt.QueryRowContext(ctx, key).Scan(&buff, &unixSeconds); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			c.logger.Error("Failed to get value", slog.String("key", key), slog.Any("err", err))
		}

		return
	}

	expirationDate = time.Unix(unixSeconds, 0)
	if expirationDate.Before(time.Now()) {
		return
	}

	if err := gob.NewDecoder(bytes.NewReader(buff)).Decode(&value); err != nil {
		c.logger.Error("Failed to decode gob value", slog.String("key", key), slog.Any("err", err))
		return
	}

	ok = true

	return
}
