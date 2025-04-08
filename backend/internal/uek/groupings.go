package uek

import (
	"context"
	"encoding/xml"
	"fmt"
	"strings"
	"time"
)

type groupingsResponse struct {
	XMLName    xml.Name `xml:"plan-zajec"`
	Grupowanie []struct {
		Typ   originalScheduleType `xml:"typ,attr"`
		Grupa string               `xml:"grupa,attr"`
	} `xml:"grupowanie"`
}

type Groupings struct {
	Group []string `json:"group"`
	Room  []string `json:"room"`
}

func (c *Client) GetGroupings(ctx context.Context) (*Groupings, time.Time, error) {
	return cacheMiddleware(c.cacheStore, "groupings", c.cacheTimeGroupings, func() (*Groupings, error) {
		return c.getFreshGroupings(ctx)
	})
}

func (c *Client) getFreshGroupings(ctx context.Context) (*Groupings, error) {
	res := groupingsResponse{}
	if err := c.fetchAndDecodeXML(ctx, fmt.Sprintf("%s?xml", baseUrl), &res); err != nil {
		return nil, err
	}

	groupings := Groupings{}
	for i, xmlGrouping := range res.Grupowanie {
		if err := func() error {
			scheduleType, err := xmlGrouping.Typ.normalize()
			if err != nil {
				return err
			}

			groupingName := strings.TrimSpace(xmlGrouping.Grupa)
			if groupingName == "" {
				return fmt.Errorf("name is missing")
			}

			switch scheduleType {
			case ScheduleTypeGroup:
				groupings.Group = append(groupings.Group, groupingName)
			case ScheduleTypeRoom:
				groupings.Room = append(groupings.Room, groupingName)
			}

			return nil
		}(); err != nil {
			return nil, fmt.Errorf("%w at index %d", err, i)
		}
	}

	return &groupings, nil
}
