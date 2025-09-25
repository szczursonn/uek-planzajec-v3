package uek

import (
	"context"
	"fmt"
	"time"
)

type SchedulePeriod struct {
	Id    int       `json:"id"`
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

func (c *Client) GetSchedulePeriods(ctx context.Context) ([]SchedulePeriod, time.Time, error) {
	if c.cfg.Cache != nil {
		if periods, validUntil, ok := c.cfg.Cache.GetPeriods(ctx); ok {
			return periods, validUntil, nil
		}
	}

	_, _, freshPeriods, periodsExpirationDate, err := c.getFreshGroupingsAndPeriods(ctx)
	if err != nil {
		return nil, time.Time{}, err
	}

	return freshPeriods, periodsExpirationDate, nil
}

func (res *responseBody) extractPeriods() ([]SchedulePeriod, error) {
	periods := make([]SchedulePeriod, 0, len(res.Okres))

	for i, originalPeriod := range res.Okres {
		start, err := time.ParseInLocation("2006-01-02 15:04", fmt.Sprintf("%s 00:00", originalPeriod.Od), uekLocation)
		if err != nil {
			return nil, fmt.Errorf("failed to parse start date at index %d: %w", i, err)
		}

		end, err := time.ParseInLocation("2006-01-02 15:04", fmt.Sprintf("%s 23:59", originalPeriod.Do), uekLocation)
		if err != nil {
			return nil, fmt.Errorf("failed to parse end date at index %d: %w", i, err)
		}

		periods = append(periods, SchedulePeriod{
			Id:    i + 1,
			Start: start,
			End:   end,
		})
	}

	return periods, nil
}
