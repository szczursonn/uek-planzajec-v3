package uek

import (
	"context"
	"encoding/xml"
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"
)

type singleSchedule struct {
	header *ScheduleHeader
	items  []*ScheduleItem
}

type ScheduleItem struct {
	Start     time.Time              `json:"start"`
	End       time.Time              `json:"end"`
	Subject   string                 `json:"subject"`
	Type      string                 `json:"type"`
	Groups    []string               `json:"groups,omitempty"`
	Lecturers []ScheduleItemLecturer `json:"lecturers,omitempty"`
	Room      *ScheduleItemRoom      `json:"room,omitempty"`
	Extra     string                 `json:"extra,omitempty"`
}

type ScheduleItemLecturer struct {
	Name     string `json:"name"`
	MoodleId int    `json:"moodleId,omitempty"`
}

type ScheduleItemRoom struct {
	Name string `json:"name"`
	URL  string `json:"url,omitempty"`
}

type scheduleResponse struct {
	XMLName xml.Name             `xml:"plan-zajec"`
	Typ     originalScheduleType `xml:"typ,attr"`
	Id      string               `xml:"id,attr"`
	Idcel   string               `xml:"idcel,attr"`
	Nazwa   string               `xml:"nazwa,attr"`
	Okres   []struct {
		Od      string `xml:"od,attr"`
		Do      string `xml:"do,attr"`
		Wybrany string `xml:"wybrany,attr"`
	} `xml:"okres"`
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

func (a *ScheduleItem) Compare(b *ScheduleItem) int {
	startCompareResult := a.Start.Compare(b.Start)
	if startCompareResult != 0 {
		return startCompareResult
	}

	endCompareResult := a.End.Compare(b.End)
	if endCompareResult != 0 {
		return endCompareResult
	}

	subjectCompareResult := strings.Compare(a.Subject, b.Subject)
	if subjectCompareResult != 0 {
		return subjectCompareResult
	}

	return strings.Compare(a.Type, b.Type)
}

func (c *Client) periodId(lastYear bool) int {
	if lastYear {
		return c.lastYearPeriodId
	}

	return c.currentYearPeriodId
}

func (c *Client) getSingleSchedule(ctx context.Context, scheduleType ScheduleType, scheduleId int, lastYear bool) (*singleSchedule, time.Time, error) {
	scheduleUrl := fmt.Sprintf("%s?typ=%s&id=%d&okres=%d&xml", baseUrl, scheduleType.asOriginal(), scheduleId, c.periodId(lastYear))

	return withCache(c.cacheStore, scheduleUrl, c.cacheTimeSchedules, func() (*singleSchedule, error) {
		res := scheduleResponse{}
		if err := c.fetchAndUnmarshalXML(ctx, scheduleUrl, &res); err != nil {
			return nil, err
		}

		return res.process(scheduleType, scheduleId)
	})
}

var scheduleItemRoomLinkRegex = regexp.MustCompile(`^<a href="(.+)">(.+)<\/a>$`)

func (res *scheduleResponse) process(requestedScheduleType ScheduleType, requestedScheduleId int) (*singleSchedule, error) {
	receivedScheduleType, err := res.Typ.asNormal()
	if err != nil {
		return nil, err
	}
	if receivedScheduleType != requestedScheduleType {
		return nil, fmt.Errorf("received different schedule type than requested: %s", receivedScheduleType)
	}

	receivedScheduleId, err := strconv.Atoi(res.Id)
	if err != nil {
		return nil, fmt.Errorf("cannot convert schedule id to number: %w", err)
	}

	if receivedScheduleId != requestedScheduleId {
		return nil, fmt.Errorf("received different schedule id: %d", receivedScheduleId)
	}

	scheduleName := strings.TrimSpace(res.Nazwa)
	if scheduleName == "" {
		return nil, fmt.Errorf("missing schedule name")
	}

	scheduleMoodleId := 0
	scheduleMoodleIdRaw := strings.TrimSpace(res.Idcel)
	if scheduleMoodleIdRaw != "" {
		scheduleMoodleId, err = parseMoodleId(scheduleMoodleIdRaw)
		if err != nil {
			return nil, err
		}
	}

	groupsFromSchedule := []string{scheduleName}
	lecturersFromSchedule := []ScheduleItemLecturer{
		{
			Name:     scheduleName,
			MoodleId: scheduleMoodleId,
		},
	}
	roomFromSchedule := &ScheduleItemRoom{
		Name: scheduleName,
	}

	items := make([]*ScheduleItem, 0, len(res.Zajecia))
	for i, resItem := range res.Zajecia {
		if err := func() (err error) {
			item := &ScheduleItem{}

			item.Type = strings.ToLower(strings.TrimSpace(resItem.Typ))
			item.Subject = strings.TrimSpace(resItem.Przedmiot)

			// remove language slots
			if item.Type == "lektorat" && strings.HasSuffix(item.Subject, "grupa przedmiotów") {
				return
			}

			item.Extra = strings.TrimSpace(resItem.Uwagi)

			item.Start, err = parseScheduleDate(resItem.Termin + " " + resItem.OdGodz)
			if err != nil {
				err = fmt.Errorf("failed to parse item end date: %w", err)
				return
			}

			item.End, err = parseScheduleDate(resItem.Termin + " " + strings.Split(resItem.DoGodz, " ")[0])
			if err != nil {
				err = fmt.Errorf("failed to parse item end date: %w", err)
				return
			}

			if item.Start.After(item.End) {
				err = fmt.Errorf("start time is after end time")
				return
			}

			if receivedScheduleType == ScheduleTypeGroup {
				item.Groups = groupsFromSchedule
			} else {
				item.Groups = make([]string, 0, 1)
				for _, group := range strings.Split(resItem.Grupa, ",") {
					group = strings.TrimSpace(group)
					if group == "" {
						continue
					}

					item.Groups = append(item.Groups, group)
				}
			}

			if receivedScheduleType == ScheduleTypeLecturer {
				item.Lecturers = lecturersFromSchedule
			} else {
				item.Lecturers = make([]ScheduleItemLecturer, 0, len(resItem.Nauczyciel))
				for j, resItemLecturer := range resItem.Nauczyciel {
					lecturerName := strings.TrimSpace(resItemLecturer.Nazwa)
					if lecturerName == "" {
						continue
					}

					lecturerMoodleId := 0
					if resItemLecturer.Moodle != "" {
						lecturerMoodleId, err = parseMoodleId(resItemLecturer.Moodle)
						if err != nil {
							err = fmt.Errorf("%w at lecturer index %d", err, j)
							return
						}
					}

					item.Lecturers = append(item.Lecturers, ScheduleItemLecturer{
						Name:     lecturerName,
						MoodleId: lecturerMoodleId,
					})
				}
			}

			if receivedScheduleType == ScheduleTypeRoom {
				item.Room = roomFromSchedule
			} else if roomName := strings.TrimSpace(resItem.Sala); roomName != "" {
				if matches := scheduleItemRoomLinkRegex.FindStringSubmatch(roomName); len(matches) > 0 {
					item.Room = &ScheduleItemRoom{
						Name: matches[2],
						URL:  matches[1],
					}
				} else {
					item.Room = &ScheduleItemRoom{
						Name: roomName,
					}
				}
			}

			items = append(items, item)
			return
		}(); err != nil {
			return nil, fmt.Errorf("%w at item index %d", err, i)
		}
	}

	slices.SortFunc(items, func(a *ScheduleItem, b *ScheduleItem) int {
		return a.Compare(b)
	})

	return &singleSchedule{
		header: &ScheduleHeader{
			Id:   receivedScheduleId,
			Name: scheduleName,
		},
		items: items,
	}, nil
}

func parseMoodleId(moodleIdStr string) (int, error) {
	moodleIdStr, _ = strings.CutPrefix(moodleIdStr, "-")

	moodleId, err := strconv.Atoi(moodleIdStr)
	if err != nil {
		return 0, fmt.Errorf("cannot convert moodle id to number: %w", err)
	}

	return moodleId, nil
}

var location = func() *time.Location {
	loc, err := time.LoadLocation("Europe/Warsaw")
	if err != nil {
		panic(fmt.Errorf("failed to load timezone data: %w", err))
	}

	return loc
}()

func parseScheduleDate(input string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02 15:04", input, location)
}
