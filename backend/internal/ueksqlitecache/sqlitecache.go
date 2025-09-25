package ueksqlitecache

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	"github.com/szczursonn/uek-planzajec-v3/internal/uek"

	_ "modernc.org/sqlite"
)

type Cache struct {
	db                     *sql.DB
	logger                 *slog.Logger
	cleanupWorkerCtx       context.Context
	cancelCleanupWorkerCtx context.CancelFunc

	getStmt     *sql.Stmt
	upsertStmt  *sql.Stmt
	cleanupStmt *sql.Stmt
}

func New(ctx context.Context, databasePath string, logger *slog.Logger) (*Cache, error) {
	db, err := sql.Open("sqlite", databasePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	c := &Cache{
		db:     db,
		logger: logger,
	}
	c.cleanupWorkerCtx, c.cancelCleanupWorkerCtx = context.WithCancel(context.Background())

	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS kv (
			key					TEXT NOT NULL,
			blob				BLOB NOT NULL,
			expiration_date			INTEGER NOT NULL,
			PRIMARY KEY(key)
		) WITHOUT ROWID,STRICT;
	`); err != nil {
		c.Close()
		return nil, fmt.Errorf("failed to setup database schema: %w", err)
	}

	if c.getStmt, err = db.PrepareContext(ctx, `
		SELECT blob, expiration_date FROM kv WHERE key = ?;
	`); err != nil {
		c.Close()
		return nil, fmt.Errorf("failed to prepare get statement: %w", err)
	}

	if c.upsertStmt, err = db.PrepareContext(ctx, `
		INSERT OR REPLACE INTO kv (key, blob, expiration_date) VALUES (?, ?, ?);
	`); err != nil {
		c.Close()
		return nil, fmt.Errorf("failed to prepare upsert statement: %w", err)
	}

	if c.cleanupStmt, err = db.PrepareContext(ctx, `
		DELETE FROM kv WHERE expiration_date < ?;
	`); err != nil {
		c.Close()
		return nil, fmt.Errorf("failed to prepare cleanup statement: %w", err)
	}

	go c.cleanupWorker()

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

		if _, err := c.cleanupStmt.Exec(time.Now().Unix()); err != nil {
			c.logger.Error("Failed to execute cleanup", slog.Any("err", err))
		}
		c.logger.Debug("Cleanup done successfully")
	}
}

func (c *Cache) Close() {
	c.cancelCleanupWorkerCtx()

	if c.getStmt != nil {
		c.getStmt.Close()
	}

	if c.upsertStmt != nil {
		c.upsertStmt.Close()
	}

	if c.cleanupStmt != nil {
		c.cleanupStmt.Close()
	}

	c.db.Close()
}

const groupingsKey = "groupings"
const periodsKey = "periods"

func headersKey(scheduleType uek.ScheduleType, groupingName string) string {
	return fmt.Sprintf("headers-%s-%s", scheduleType, groupingName)
}

func scheduleKey(scheduleType uek.ScheduleType, scheduleId int, periodId int) string {
	return fmt.Sprintf("schedule-%s-%d-%d", scheduleType, scheduleId, periodId)
}
