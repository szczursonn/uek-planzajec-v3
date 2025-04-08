package uek

import (
	"context"
	"encoding/xml"
	"strings"
	"time"
)

type Groupings struct {
	Groups []string `json:"groups"`
	Rooms  []string `json:"rooms"`
}

type groupingsResponse struct {
	XMLName    xml.Name `xml:"plan-zajec"`
	Grupowanie []struct {
		Typ   originalScheduleType `xml:"typ,attr"`
		Grupa string               `xml:"grupa,attr"`
	} `xml:"grupowanie"`
}

func (c *Client) GetGroupings(ctx context.Context) (*Groupings, time.Time, error) {
	const groupingsUrl = baseUrl + "?xml"

	return withCache(c.cacheStore, groupingsUrl, c.cacheTimeGroupings, func() (*Groupings, error) {
		res := groupingsResponse{}
		if err := c.fetchAndUnmarshalXML(ctx, groupingsUrl, &res); err != nil {
			return nil, err
		}

		return res.extractGroupings(), nil
	})
}

func (res *groupingsResponse) extractGroupings() *Groupings {
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
