package uek

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/html"
	"golang.org/x/sync/errgroup"
)

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

type schedule struct {
	id       int
	name     string
	moodleId int
	items    []*ScheduleItem
}

type AggregateSchedule struct {
	Headers []AggregateScheduleHeader `json:"headers"`
	Items   []*ScheduleItem           `json:"items"`
}

type AggregateScheduleHeader struct {
	Id       int    `json:"id"`
	Name     string `json:"name"`
	MoodleId int    `json:"moodleId,omitempty"`
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

const ScheduleItemTypeLanguageSlot = "language_slot"

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

func (a *ScheduleItem) EqualIgnoringGroups(b *ScheduleItem) bool {
	if !a.Start.Equal(b.Start) || !a.End.Equal(b.End) || a.Subject != b.Subject || a.Type != b.Type || a.Extra != b.Extra || len(a.Lecturers) != len(b.Lecturers) {
		return false
	}

	for i := range len(a.Lecturers) {
		if a.Lecturers[i].Name != b.Lecturers[i].Name || a.Lecturers[i].MoodleId != b.Lecturers[i].MoodleId {
			return false
		}
	}

	if a.Room != nil && b.Room != nil {
		return a.Room.Name == b.Room.Name && a.Room.URL == b.Room.URL
	}

	return a.Room == nil && b.Room == nil
}

func (item *ScheduleItem) ShallowCopy() *ScheduleItem {
	return &ScheduleItem{
		Start:     item.Start,
		End:       item.End,
		Subject:   item.Subject,
		Type:      item.Type,
		Groups:    item.Groups,
		Lecturers: item.Lecturers,
		Room:      item.Room,
		Extra:     item.Extra,
	}
}

func (c *Client) GetAggregateSchedule(ctx context.Context, scheduleType ScheduleType, scheduleIds []int, lastYear bool) (*AggregateSchedule, time.Time, error) {
	eg, egCtx := errgroup.WithContext(ctx)
	schedules := make([]*schedule, len(scheduleIds))
	cacheExpirationDates := make([]time.Time, len(scheduleIds))

	for i, scheduleId := range scheduleIds {
		eg.Go(func() (err error) {
			schedules[i], cacheExpirationDates[i], err = c.getSchedule(egCtx, scheduleType, scheduleId, lastYear)
			return
		})
	}

	if err := eg.Wait(); err != nil {
		return nil, time.Time{}, err
	}

	return mergeSchedules(schedules), pickLowestTime(cacheExpirationDates), nil
}

// sorted lists merge + deduping without additional sorting
func mergeSchedules(schedules []*schedule) *AggregateSchedule {
	headers := make([]AggregateScheduleHeader, 0, len(schedules))
	totalItemCount := 0
	for _, schedule := range schedules {
		headers = append(headers, AggregateScheduleHeader{
			Id:       schedule.id,
			Name:     schedule.name,
			MoodleId: schedule.moodleId,
		})
		totalItemCount += len(schedule.items)
	}

	items := make([]*ScheduleItem, 0, totalItemCount)
	itemIndexesBySchedule := make([]int, len(schedules))
	for {
		var nextItem *ScheduleItem
		var nextItemScheduleIndex int

		for scheduleIndex, itemIndex := range itemIndexesBySchedule {
			scheduleItems := schedules[scheduleIndex].items
			if itemIndex == len(scheduleItems) {
				continue
			}

			nextItemForSchedule := scheduleItems[itemIndex]
			if nextItem == nil || nextItem.Compare(nextItemForSchedule) == 1 {
				nextItem = nextItemForSchedule
				nextItemScheduleIndex = scheduleIndex
			}
		}

		if nextItem == nil {
			break
		}
		itemIndexesBySchedule[nextItemScheduleIndex]++

		previousItemIndex := len(items) - 1
		if previousItemIndex > -1 && nextItem.EqualIgnoringGroups(items[previousItemIndex]) {
			mergedItem := items[previousItemIndex].ShallowCopy()
			mergedItem.Groups = append(make([]string, 0, len(mergedItem.Groups)+len(nextItem.Groups)), mergedItem.Groups...)
			for _, nextItemGroup := range nextItem.Groups {
				if !slices.Contains(mergedItem.Groups, nextItemGroup) {
					mergedItem.Groups = append(mergedItem.Groups, nextItemGroup)
				}
			}
			items[previousItemIndex] = mergedItem
		} else {
			items = append(items, nextItem)
		}
	}

	return &AggregateSchedule{
		Headers: headers,
		Items:   items,
	}
}

func (c *Client) getSchedule(ctx context.Context, scheduleType ScheduleType, scheduleId int, lastYear bool) (*schedule, time.Time, error) {
	return cacheMiddleware(c.cacheStore, fmt.Sprint("schedule", scheduleType, scheduleId, lastYear), c.cacheTimeSchedules, func() (*schedule, error) {
		return c.getFreshSchedule(ctx, scheduleType, scheduleId, lastYear)
	})
}

func (c *Client) getFreshSchedule(ctx context.Context, scheduleType ScheduleType, scheduleId int, lastYear bool) (*schedule, error) {
	var periodId int
	if lastYear {
		periodId = c.lastYearPeriodId
	} else {
		periodId = c.currentYearPeriodId
	}

	res := scheduleResponse{}
	if err := c.fetchAndDecodeXML(ctx, fmt.Sprintf("%s?typ=%s&id=%d&okres=%d&xml", baseUrl, scheduleType.denormalize(), scheduleId, periodId), &res); err != nil {
		return nil, err
	}

	receivedScheduleType, err := res.Typ.normalize()
	if err != nil {
		return nil, err
	}
	if receivedScheduleType != scheduleType {
		return nil, fmt.Errorf("received different schedule type than requested: %s", receivedScheduleType)
	}

	receivedScheduleId, err := strconv.Atoi(res.Id)
	if err != nil {
		return nil, fmt.Errorf("cannot convert id to number: %w", err)
	}

	if receivedScheduleId != scheduleId {
		return nil, fmt.Errorf("received different schedule id: %d", receivedScheduleId)
	}

	scheduleMoodleId := 0
	if res.Idcel != "" {
		scheduleMoodleId, err = parseMoodleId(res.Idcel)
		if err != nil {
			return nil, err
		}
	}

	scheduleName := strings.TrimSpace(res.Nazwa)
	if scheduleName == "" {
		return nil, fmt.Errorf("missing schedule name")
	}

	items := make([]*ScheduleItem, 0, len(res.Zajecia))
	for i, xmlItem := range res.Zajecia {
		if item, err := func() (item *ScheduleItem, err error) {
			item = &ScheduleItem{}

			item.Start, err = parseScheduleDate(xmlItem.Termin + " " + xmlItem.OdGodz)
			if err != nil {
				err = fmt.Errorf("failed to parse item start date: %w", err)
				return
			}

			item.End, err = parseScheduleDate(xmlItem.Termin + " " + strings.Split(xmlItem.DoGodz, " ")[0])
			if err != nil {
				err = fmt.Errorf("failed to parse item end date: %w", err)
				return
			}

			if item.Start.After(item.End) {
				err = fmt.Errorf("start time is after end time")
				return
			}

			if scheduleType == ScheduleTypeGroup {
				item.Groups = []string{scheduleName}
			} else {
				item.Groups = make([]string, 0, 1)
				for _, group := range strings.Split(xmlItem.Grupa, ",") {
					group = strings.TrimSpace(group)
					if group == "" {
						continue
					}

					item.Groups = append(item.Groups, group)
				}
			}

			if scheduleType == ScheduleTypeLecturer {
				item.Lecturers = []ScheduleItemLecturer{
					{
						Name:     scheduleName,
						MoodleId: scheduleMoodleId,
					},
				}
			} else {
				item.Lecturers = make([]ScheduleItemLecturer, 0, len(xmlItem.Nauczyciel))
				for j, xmlLecturer := range xmlItem.Nauczyciel {
					lecturerName := strings.TrimSpace(xmlLecturer.Nazwa)
					if lecturerName == "" {
						continue
					}

					lecturerMoodleId := 0
					if xmlLecturer.Moodle != "" {
						lecturerMoodleId, err = parseMoodleId(xmlLecturer.Moodle)
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

			item.Subject = strings.TrimSpace(xmlItem.Przedmiot)
			item.Type = strings.ToLower(strings.TrimSpace(xmlItem.Typ))
			item.Extra = strings.TrimSpace(xmlItem.Uwagi)
			// keep uppercase acronym
			if strings.HasPrefix(item.Type, "ppuz") {
				item.Type = "PPUZ" + item.Type[4:]
			}

			if item.Type == "lektorat" && strings.HasSuffix(item.Subject, "grupa przedmiotów") {
				item.Type = ScheduleItemTypeLanguageSlot
			} else {
				// room information is pretty much useless for language slots

				if scheduleType == ScheduleTypeRoom {
					item.Room = &ScheduleItemRoom{
						Name: scheduleName,
					}
				} else {
					roomName := strings.TrimSpace(xmlItem.Sala)
					if roomName != "" {
						item.Room = &ScheduleItemRoom{
							Name: roomName,
						}
						if strings.HasPrefix(roomName, "<a") {
							if parsedHTMLNodes, err := html.ParseFragment(strings.NewReader(xmlItem.Sala), nil); err == nil && len(parsedHTMLNodes) > 0 && parsedHTMLNodes[0].LastChild != nil && parsedHTMLNodes[0].LastChild.LastChild != nil && parsedHTMLNodes[0].LastChild.LastChild.FirstChild != nil && parsedHTMLNodes[0].LastChild.LastChild.Type == html.ElementNode && parsedHTMLNodes[0].LastChild.LastChild.Data == "a" {
								item.Room.Name = strings.TrimSpace(parsedHTMLNodes[0].LastChild.LastChild.FirstChild.Data)
								for _, attr := range parsedHTMLNodes[0].LastChild.LastChild.Attr {
									if attr.Key == "href" {
										if _, err = url.ParseRequestURI(attr.Val); err == nil {
											item.Room.URL = attr.Val
										}
										break
									}
								}
							}
						}
					}
				}
			}

			return
		}(); err != nil {
			return nil, fmt.Errorf("%w at index %d", err, i)
		} else {
			items = append(items, item)
		}
	}

	slices.SortFunc(items, func(a *ScheduleItem, b *ScheduleItem) int {
		return a.Compare(b)
	})

	return &schedule{
		id:       scheduleId,
		name:     scheduleName,
		moodleId: scheduleMoodleId,
		items:    items,
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

func pickLowestTime(times []time.Time) time.Time {
	lowestTime := times[0]
	for _, otherTime := range times[1:] {
		if otherTime.Before(lowestTime) {
			lowestTime = otherTime
		}
	}
	return lowestTime
}
