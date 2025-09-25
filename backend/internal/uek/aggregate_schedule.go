package uek

import (
	"context"
	"slices"
	"time"

	"golang.org/x/sync/errgroup"
)

type AggregateSchedule struct {
	Headers []ScheduleHeader `json:"headers"`
	Items   []*ScheduleItem  `json:"items"`
}

func (c *Client) GetAggregateSchedule(ctx context.Context, scheduleType ScheduleType, scheduleIds []int, periodId int) (*AggregateSchedule, time.Time, error) {
	eg, egCtx := errgroup.WithContext(ctx)
	singleSchedules := make([]*Schedule, len(scheduleIds))
	cacheExpirationDates := make([]time.Time, len(scheduleIds))

	for i, scheduleId := range scheduleIds {
		eg.Go(func() (err error) {
			singleSchedules[i], cacheExpirationDates[i], err = c.getSchedule(egCtx, scheduleType, scheduleId, periodId)
			return
		})
	}

	if err := eg.Wait(); err != nil {
		return nil, time.Time{}, err
	}

	return mergeSchedules(singleSchedules), minTime(cacheExpirationDates), nil
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

// sorted lists merge + deduping without additional sorting
func mergeSchedules(singleSchedules []*Schedule) *AggregateSchedule {
	headers := make([]ScheduleHeader, 0, len(singleSchedules))
	totalItemCount := 0
	for _, schedule := range singleSchedules {
		headers = append(headers, schedule.Header)
		totalItemCount += len(schedule.Items)
	}

	items := make([]*ScheduleItem, 0, totalItemCount)
	currentItemIndexesBySchedule := make([]int, len(singleSchedules))
	for {
		var nextItem *ScheduleItem
		var nextItemScheduleIndex int

		for scheduleIndex, currentItemIndex := range currentItemIndexesBySchedule {
			scheduleItems := singleSchedules[scheduleIndex].Items
			if currentItemIndex == len(scheduleItems) {
				continue
			}

			nextItemForCurrentSchedule := scheduleItems[currentItemIndex]
			if nextItem == nil || nextItem.Compare(nextItemForCurrentSchedule) == 1 {
				nextItem = nextItemForCurrentSchedule
				nextItemScheduleIndex = scheduleIndex
			}
		}

		if nextItem == nil {
			break
		}
		currentItemIndexesBySchedule[nextItemScheduleIndex]++

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

func minTime(times []time.Time) time.Time {
	lowestTime := times[0]
	for _, otherTime := range times[1:] {
		if otherTime.Before(lowestTime) {
			lowestTime = otherTime
		}
	}
	return lowestTime
}
