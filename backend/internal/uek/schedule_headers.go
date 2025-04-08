package uek

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type ScheduleHeader struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

type headersResponse struct {
	XMLName xml.Name `xml:"plan-zajec"`
	Zasob   []struct {
		Typ   originalScheduleType `xml:"typ,attr"`
		Id    string               `xml:"id,attr"`
		Nazwa string               `xml:"nazwa,attr"`
	} `xml:"zasob"`
}

func (c *Client) GetHeaders(ctx context.Context, scheduleType ScheduleType, groupingName string) ([]ScheduleHeader, time.Time, error) {
	headersUrl := fmt.Sprintf("%s?typ=%s&grupa=%s&xml", baseUrl, scheduleType.asOriginal(), url.QueryEscape(groupingName))

	return withCache(c.cacheStore, headersUrl, c.cacheTimeHeaders, func() ([]ScheduleHeader, error) {
		res := headersResponse{}
		if err := c.fetchAndUnmarshalXML(ctx, headersUrl, &res); err != nil {
			return nil, err
		}

		return res.extractHeaders(scheduleType), nil
	})
}

func (res *headersResponse) extractHeaders(requestedScheduleType ScheduleType) []ScheduleHeader {
	headers := make([]ScheduleHeader, 0, len(res.Zasob))

	for _, originalHeader := range res.Zasob {
		receivedScheduleType, err := originalHeader.Typ.asNormal()
		if err != nil {
			continue
		}
		if receivedScheduleType != requestedScheduleType {
			continue
		}

		headerName := strings.TrimSpace(originalHeader.Nazwa)
		if headerName == "" {
			continue
		}

		headerId, err := strconv.Atoi(originalHeader.Id)
		if err != nil {
			continue
		}

		headers = append(headers, ScheduleHeader{
			Id:   headerId,
			Name: headerName,
		})
	}

	return headers
}
