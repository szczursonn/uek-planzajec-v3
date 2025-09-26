package uek

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/http"
	"time"

	"github.com/szczursonn/uek-planzajec-v3/internal/config"
)

const baseUrl = "https://planzajec.uek.krakow.pl/index.php"
const UserAgent = "uek-planzajec-v3/1.0 (+https://uek-planzajec-v3.fly.dev)"

type ClientConfig struct {
	HttpClient *http.Client
	Cache      Cache
	CacheTimes config.CacheTimes
}

type Client struct {
	cfg                    ClientConfig
	selfRateLimitSemaphore chan struct{}
}

type Cache interface {
	GetGroupings(ctx context.Context) (*Groupings, time.Time, bool)
	PutGroupingsAndPeriods(cacheExpirationDateGroupings time.Time, groupings *Groupings, cacheExpirationDatePeriods time.Time, periods []SchedulePeriod)

	GetHeaders(ctx context.Context, scheduleType ScheduleType, groupingName string) ([]ScheduleHeader, time.Time, bool)
	PutHeaders(cacheExpirationDate time.Time, scheduleType ScheduleType, groupingName string, headers []ScheduleHeader)

	GetSchedule(ctx context.Context, scheduleType ScheduleType, scheduleId int, periodId int) (*Schedule, time.Time, bool)
	PutScheduleAndPeriods(cacheExpirationDateSchedule time.Time, scheduleType ScheduleType, scheduleId int, periodId int, schedule *Schedule, cacheExpirationDatePeriods time.Time, periods []SchedulePeriod)

	GetPeriods(ctx context.Context) ([]SchedulePeriod, time.Time, bool)
}

func NewClient(cfg ClientConfig) *Client {
	return &Client{
		cfg: cfg,
		// when there are 2+ concurrent requests response times get extremely long - waterfalls are faster
		// 2+1 requests - 300-400ms, 3 requests - 1000+ms
		selfRateLimitSemaphore: make(chan struct{}, 2),
	}
}

type responseBody struct {
	XMLName xml.Name             `xml:"plan-zajec"`
	Typ     originalScheduleType `xml:"typ,attr"`
	Id      string               `xml:"id,attr"`
	Idcel   string               `xml:"idcel,attr"`
	Nazwa   string               `xml:"nazwa,attr"`
	Okres   []struct {
		Od string `xml:"od,attr"`
		Do string `xml:"do,attr"`
	} `xml:"okres"`
	Grupowanie []struct {
		Typ   originalScheduleType `xml:"typ,attr"`
		Grupa string               `xml:"grupa,attr"`
	} `xml:"grupowanie"`
	Zasob []struct {
		Typ   originalScheduleType `xml:"typ,attr"`
		Id    string               `xml:"id,attr"`
		Nazwa string               `xml:"nazwa,attr"`
	} `xml:"zasob"`
	Zajecia []struct {
		Termin     string `xml:"termin"`
		OdGodz     string `xml:"od-godz"`
		DoGodz     string `xml:"do-godz"`
		Przedmiot  string `xml:"przedmiot"`
		Typ        string `xml:"typ"`
		Nauczyciel []struct {
			Moodle string `xml:"moodle,attr"`
			Nazwa  string `xml:",chardata"`
		} `xml:"nauczyciel"`
		Sala  string `xml:"sala"`
		Grupa string `xml:"grupa"`
		Uwagi string `xml:"uwagi"`
	} `xml:"zajecia"`
}

func (c *Client) fetchAndUnmarshalXML(ctx context.Context, targetUrl string) (*responseBody, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetUrl, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Content-Type", "application/xml")

	c.selfRateLimitSemaphore <- struct{}{}
	defer func() {
		<-c.selfRateLimitSemaphore
	}()

	httpClient := c.cfg.HttpClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	res, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to do request: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", res.StatusCode)
	}

	resBody := &responseBody{}
	if err = xml.NewDecoder(res.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("failed to decode xml response: %w", err)
	}

	return resBody, nil
}
