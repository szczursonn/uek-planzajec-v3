package uek

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type Groupings struct {
	Groups []string `json:"groups"`
	Rooms  []string `json:"rooms"`
}

func (c *Client) GetGroupings(ctx context.Context) (*Groupings, time.Time, error) {
	if c.cfg.Cache != nil {
		if groupings, validUntil, ok := c.cfg.Cache.GetGroupings(ctx); ok {
			return groupings, validUntil, nil
		}
	}

	freshGroupings, freshGroupingsExpirationDate, _, _, err := c.getFreshGroupingsAndPeriods(ctx)
	if err != nil {
		return nil, time.Time{}, err
	}

	return freshGroupings, freshGroupingsExpirationDate, nil
}

// adding "okres" param always makes response include period info, even in non-schedule calls
func (c *Client) getFreshGroupingsAndPeriods(ctx context.Context) (*Groupings, time.Time, []SchedulePeriod, time.Time, error) {
	const groupingsUrl = baseUrl + "?okres=1&xml"
	res, err := c.fetchAndUnmarshalXML(ctx, groupingsUrl)
	if err != nil {
		return nil, time.Time{}, nil, time.Time{}, err
	}
	groupingsExpirationDate := time.Now().Add(c.cfg.CacheTimeGroupings)
	periodsExpirationDate := time.Now().Add(c.cfg.CacheTimePeriods)

	groupings := res.extractGroupings()
	periods, err := res.extractPeriods()
	if err != nil {
		return nil, time.Time{}, nil, time.Time{}, fmt.Errorf("failed to parse periods: %w", err)
	}

	if c.cfg.Cache != nil {
		go c.cfg.Cache.PutGroupingsAndPeriods(groupingsExpirationDate, groupings, periodsExpirationDate, periods)
	}

	return groupings, groupingsExpirationDate, periods, periodsExpirationDate, nil
}

func (res *responseBody) extractGroupings() *Groupings {
	groupings := &Groupings{}
	for _, originalGrouping := range res.Grupowanie {
		scheduleType, err := originalGrouping.Typ.asNormal()
		if err != nil {
			continue
		}

		groupingName := strings.TrimSpace(originalGrouping.Grupa)
		if groupingName == "" {
			continue
		}

		switch scheduleType {
		case ScheduleTypeGroup:
			groupings.Groups = append(groupings.Groups, groupingName)
		case ScheduleTypeRoom:
			groupings.Rooms = append(groupings.Rooms, groupingName)
		}
	}

	return groupings
}
