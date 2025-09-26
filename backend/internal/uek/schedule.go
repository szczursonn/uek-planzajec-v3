package uek

import (
	"context"
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"
)

type Schedule struct {
	Header ScheduleHeader  `json:"header"`
	Items  []*ScheduleItem `json:"items"`
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

func (c *Client) getSchedule(ctx context.Context, scheduleType ScheduleType, scheduleId int, periodId int) (*Schedule, time.Time, error) {
	if c.cfg.Cache != nil {
		if schedule, validUntil, ok := c.cfg.Cache.GetSchedule(ctx, scheduleType, scheduleId, periodId); ok {
			return schedule, validUntil, nil
		}
	}
	scheduleExpirationDate := time.Now().Add(c.cfg.CacheTimes.Schedules)
	periodsExpirationDate := time.Now().Add(c.cfg.CacheTimes.Periods)

	res, err := c.fetchAndUnmarshalXML(ctx, fmt.Sprintf("%s?typ=%s&id=%d&okres=%d&xml", baseUrl, scheduleType.asOriginal(), scheduleId, periodId))
	if err != nil {
		return nil, time.Time{}, err
	}

	schedule, periods, err := res.extractSchedule(scheduleType, scheduleId)
	if err != nil {
		return nil, time.Time{}, err
	}

	if c.cfg.Cache != nil {
		go c.cfg.Cache.PutScheduleAndPeriods(scheduleExpirationDate, scheduleType, scheduleId, periodId, schedule, periodsExpirationDate, periods)
	}

	return schedule, scheduleExpirationDate, nil
}

var scheduleItemRoomLinkRegex = regexp.MustCompile(`^<a href="(.+)">(.+)<\/a>$`)

func (res *responseBody) extractSchedule(requestedScheduleType ScheduleType, requestedScheduleId int) (*Schedule, []SchedulePeriod, error) {
	receivedScheduleType, err := res.Typ.asNormal()
	if err != nil {
		return nil, nil, err
	}
	if receivedScheduleType != requestedScheduleType {
		return nil, nil, fmt.Errorf("received different schedule type than requested: %s", receivedScheduleType)
	}

	receivedScheduleId, err := strconv.Atoi(res.Id)
	if err != nil {
		return nil, nil, fmt.Errorf("cannot convert schedule id to number: %w", err)
	}

	if receivedScheduleId != requestedScheduleId {
		return nil, nil, fmt.Errorf("received different schedule id: %d", receivedScheduleId)
	}

	scheduleName := strings.TrimSpace(res.Nazwa)
	if scheduleName == "" {
		return nil, nil, fmt.Errorf("missing schedule name")
	}

	scheduleMoodleId := 0
	scheduleMoodleIdRaw := strings.TrimSpace(res.Idcel)
	if scheduleMoodleIdRaw != "" {
		scheduleMoodleId, err = parseMoodleId(scheduleMoodleIdRaw)
		if err != nil {
			return nil, nil, err
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

			// remove language slots, who cares
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
			return nil, nil, fmt.Errorf("%w at item index %d", err, i)
		}
	}

	slices.SortFunc(items, func(a *ScheduleItem, b *ScheduleItem) int {
		return a.Compare(b)
	})

	periods, err := res.extractPeriods()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to extract periods: %w", err)
	}

	return &Schedule{
		Header: ScheduleHeader{
			Id:   receivedScheduleId,
			Name: scheduleName,
		},
		Items: items,
	}, periods, nil
}

func parseMoodleId(moodleIdStr string) (int, error) {
	moodleIdStr, _ = strings.CutPrefix(moodleIdStr, "-")

	moodleId, err := strconv.Atoi(moodleIdStr)
	if err != nil {
		return 0, fmt.Errorf("cannot convert moodle id to number: %w", err)
	}

	return moodleId, nil
}

var uekLocation = func() *time.Location {
	loc, err := time.LoadLocation("Europe/Warsaw")
	if err != nil {
		panic(fmt.Errorf("failed to load timezone data: %w", err))
	}

	return loc
}()

func parseScheduleDate(input string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02 15:04", input, uekLocation)
}
