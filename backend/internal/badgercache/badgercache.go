package badgercache

import (
	"bytes"
	"context"
	"encoding/gob"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/dgraph-io/badger/v4"
	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
)

type Cache struct {
	db                     *badger.DB
	logger                 *slog.Logger
	cleanupWorkerCtx       context.Context
	cancelCleanupWorkerCtx context.CancelFunc
}

type badgerLogger struct {
	logger *slog.Logger
}

func (bl *badgerLogger) Errorf(format string, args ...any) {
	bl.logger.Error(fmt.Sprintf(format, args...))
}

func (bl *badgerLogger) Warningf(format string, args ...any) {
	bl.logger.Warn(fmt.Sprintf(format, args...))
}

func (bl *badgerLogger) Infof(format string, args ...any) {
	bl.logger.Debug(fmt.Sprintf(format, args...))
}

func (bl *badgerLogger) Debugf(format string, args ...any) {
	bl.logger.Debug(fmt.Sprintf(format, args...))
}

func New(filePath string, logger *slog.Logger) (*Cache, error) {
	opts := badger.DefaultOptions(filePath).WithLogger(&badgerLogger{
		logger: logger,
	}).WithValueLogFileSize(5 << 20 /* 5MB */).WithMemTableSize(4 << 20 /* 4MB */).WithValueThreshold(512 << 10 /* 512KB */).WithNumLevelZeroTables(2)
	if filePath == "" {
		opts = opts.WithInMemory(true)
	}

	db, err := badger.Open(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	c := &Cache{
		db:     db,
		logger: logger,
	}
	c.cleanupWorkerCtx, c.cancelCleanupWorkerCtx = context.WithCancel(context.Background())

	if !opts.InMemory {
		go c.cleanupWorker()
	}

	return c, nil
}

func (c *Cache) cleanupWorker() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-c.cleanupWorkerCtx.Done():
			return
		case <-ticker.C:
		}

		if err := c.db.RunValueLogGC(0.5); err != nil && !errors.Is(err, badger.ErrNoRewrite) {
			c.logger.Error("Failed to execute cleanup", slog.Any("err", err))
		} else {
			c.logger.Debug("Cleanup executed successfully")
		}
	}
}

func (c *Cache) Close() {
	c.cancelCleanupWorkerCtx()
	c.db.Close()
}

func get[T any](c *Cache, key string) (value T, expirationDate time.Time, ok bool) {
	err := c.db.View(func(tx *badger.Txn) error {
		item, err := tx.Get([]byte(key))
		if err != nil {
			return err
		}

		expirationDate = time.Unix(int64(item.ExpiresAt()), 0)

		return item.Value(func(itemValue []byte) error {
			return gob.NewDecoder(bytes.NewReader(itemValue)).Decode(&value)
		})
	})

	if err == nil {
		ok = true
	} else if errors.Is(err, badger.ErrKeyNotFound) {
		c.logger.Debug("Cache miss", slog.String("key", key))
	} else {
		c.logger.Error("Failed to get value", slog.String("key", key), slog.Any("err", err))
	}

	return
}

func put[T any](c *Cache, key string, value T, expirationDate time.Time) {
	buff := &bytes.Buffer{}
	if err := gob.NewEncoder(buff).Encode(value); err != nil {
		c.logger.Error("Failed to encode value", slog.String("key", key), slog.Any("err", err))
		return
	}

	if err := c.db.Update(func(tx *badger.Txn) error {
		return tx.SetEntry(badger.NewEntry([]byte(key), buff.Bytes()).WithTTL(time.Until(expirationDate)))
	}); err != nil {
		c.logger.Error("Failed to upsert value", slog.String("key", key), slog.Any("err", err))
	}
}

const groupingsKey = "groupings"
const periodsKey = "periods"

func makeHeadersKey(scheduleType uek.ScheduleType, groupingName string) string {
	return fmt.Sprintf("headers-%s-%s", scheduleType, groupingName)
}

func makeScheduleKey(scheduleType uek.ScheduleType, scheduleId int, periodId int) string {
	return fmt.Sprintf("schedule-%s-%d-%d", scheduleType, scheduleId, periodId)
}

func (c *Cache) GetGroupings(_ context.Context) (*uek.Groupings, time.Time, bool) {
	return get[*uek.Groupings](c, groupingsKey)
}

func (c *Cache) GetHeaders(_ context.Context, scheduleType uek.ScheduleType, groupingName string) ([]uek.ScheduleHeader, time.Time, bool) {
	return get[[]uek.ScheduleHeader](c, makeHeadersKey(scheduleType, groupingName))
}

func (c *Cache) GetSchedule(_ context.Context, scheduleType uek.ScheduleType, scheduleId int, periodId int) (*uek.Schedule, time.Time, bool) {
	return get[*uek.Schedule](c, makeScheduleKey(scheduleType, scheduleId, periodId))
}

func (c *Cache) GetPeriods(_ context.Context) ([]uek.SchedulePeriod, time.Time, bool) {
	return get[[]uek.SchedulePeriod](c, periodsKey)
}

func (c *Cache) PutGroupingsAndPeriods(cacheExpirationDateGroupings time.Time, groupings *uek.Groupings, cacheExpirationDatePeriods time.Time, periods []uek.SchedulePeriod) {
	put(c, groupingsKey, groupings, cacheExpirationDateGroupings)
	put(c, periodsKey, periods, cacheExpirationDatePeriods)
}

func (c *Cache) PutHeaders(cacheExpirationDate time.Time, scheduleType uek.ScheduleType, groupingName string, headers []uek.ScheduleHeader) {
	put(c, makeHeadersKey(scheduleType, groupingName), headers, cacheExpirationDate)
}

func (c *Cache) PutScheduleAndPeriods(cacheExpirationDateSchedule time.Time, scheduleType uek.ScheduleType, scheduleId int, periodId int, schedule *uek.Schedule, cacheExpirationDatePeriods time.Time, periods []uek.SchedulePeriod) {
	put(c, makeScheduleKey(scheduleType, scheduleId, periodId), schedule, cacheExpirationDateSchedule)
	put(c, periodsKey, periods, cacheExpirationDatePeriods)
}
