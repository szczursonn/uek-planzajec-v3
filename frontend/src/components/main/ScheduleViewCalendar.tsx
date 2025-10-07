import { useMemo } from 'preact/hooks';
import { Fragment } from 'preact/jsx-runtime';
import clsx from 'clsx';
import { useCurrentDate } from '../../lib/date/useCurrentDate';
import { labels } from '../../lib/intl/labels';
import { LOCALE } from '../../lib/intl/locale';
import { DateParts } from '../../lib/date/dateParts';
import { getClosestFutureSunday, getClosestPastMonday } from '../../lib/date/dateUtils';
import { TIME_ZONE } from '../../lib/date/timeZone';
import { createMoodleURL } from '../../lib/api/common';
import type { ScheduleItem, ScheduleItemTypeCategory } from '../../lib/api/aggregateSchedule';
import { scheduleTypeState, useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { highlightOnlineOnlyDaysState, LONG_BREAK_THRESHOLD, showLongBreaksState } from '../../lib/scheduleViewConfig';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { useSchedulePeriod } from '../../lib/schedulePeriod';

const getScheduleItemTypeCategoryClass = (category: ScheduleItemTypeCategory) => {
    switch (category) {
        case 'lecture':
            return 'bg-sky-800 border-sky-900 shadow-sky-700/25';
        case 'exercise':
            return 'bg-amber-800 border-amber-900 shadow-amber-700/25';
        case 'language':
            return 'bg-green-700 border-green-900 shadow-green-700/25';
        case 'exam':
            return 'bg-red-700 border-red-900 shadow-red-700/25';
        case 'cancelled':
            return 'bg-zinc-800 border-zinc-900 text-zinc-400 shadow-zinc-800/25';
        default:
            return 'bg-zinc-800 border-zinc-900 shadow-zinc-800/25';
    }
};

const groupLabelFormatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE.UEK,
    day: 'numeric',
    month: 'short',
    weekday: 'short',
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat(LOCALE, {
    numeric: 'auto',
    style: 'long',
});

const formatItemRelativeTime = (itemDate: Date, now: Date) => {
    const minutes = Math.round((itemDate.getTime() - now.getTime()) / (1000 * 60));
    const minutesAbs = Math.abs(minutes);

    // Minutes format is shown below 2h
    if (minutesAbs < 120) {
        return relativeTimeFormatter.format(minutes, 'minutes');
    }

    if (minutesAbs < 1440) {
        return relativeTimeFormatter.format(Math.round(minutes / 60), 'hours');
    }

    return relativeTimeFormatter.format(Math.round(minutes / 1440), 'days');
};

export const ScheduleViewCalendar = () => {
    const query = useAppScheduleQuery();
    const currentDate = useCurrentDate('minute');
    const isCurrentSchedulePeriodUpcoming = useSchedulePeriod()[0] === 'inferUpcoming';
    const currentShowLongBreaks = showLongBreaksState.use();
    const currentHighlightOnlineOnlyDays = highlightOnlineOnlyDaysState.use();
    const currentScheduleType = scheduleTypeState.use();

    const dayColumns = useMemo(() => {
        const currentDateParts = DateParts.fromDate(currentDate);

        const dayColumns: {
            label: string;
            currentDateRelation: 'past' | 'current' | 'future';
            isOnlineOnly: boolean;
            items: ScheduleItem[];
        }[] = [];
        let currentItemIndex = 0;

        for (const dateParts of DateParts.eachDayBetween(
            DateParts.fromDate(
                getClosestPastMonday(
                    isCurrentSchedulePeriodUpcoming
                        ? currentDate
                        : (query.data?.schedule.filteredItems[0]?.start.date ?? currentDate),
                ),
            ),
            DateParts.fromDate(
                getClosestFutureSunday(
                    new Date(
                        Math.max(
                            query.data?.schedule.filteredItems.at(-1)?.start.date.getTime() ?? currentDate.getTime(),
                            currentDate.getTime(),
                        ),
                    ),
                ),
            ),
        )) {
            const compareNowResult = dateParts.compareWithoutTime(currentDateParts);
            const newDayColumn = {
                label: groupLabelFormatter.format(dateParts.toDate()),
                currentDateRelation: compareNowResult === -1 ? 'past' : compareNowResult === 0 ? 'current' : 'future',
                isOnlineOnly: false,
                items: [],
            } as (typeof dayColumns)[number];

            while (currentItemIndex < (query.data?.schedule.filteredItems.length ?? 0)) {
                const item = query.data!.schedule.filteredItems[currentItemIndex]!;
                if (!item.start.parts.isEqualWithoutTime(dateParts)) {
                    break;
                }

                newDayColumn.items.push(item);
                newDayColumn.isOnlineOnly = newDayColumn.isOnlineOnly || item.isOnline;
                currentItemIndex++;
            }

            dayColumns.push(newDayColumn);
        }

        return dayColumns;
    }, [query.data?.schedule.filteredItems, currentDate.getTime(), isCurrentSchedulePeriodUpcoming]);

    let hasFutureItemOutlineBeenRendered = false;

    return (
        <ul class="3xl:px-[10%] grid w-full grid-cols-1 gap-x-1 gap-y-4 p-2 sm:grid-cols-7 sm:gap-y-10 md:gap-x-2 md:p-4 xl:px-[5%]">
            {query.data?.schedule.filteredItems.length === 0 && (
                <span class="text-center text-xl font-semibold sm:hidden">{labels.noScheduleItemsMessage}</span>
            )}
            {query.isLoading
                ? [...Array(7 * 4).keys()].map((i) => (
                      <li key={i} class="cursor-progress">
                          <span class="bg-x-bg-quaternary my-3 flex h-8 animate-pulse rounded-md"></span>
                          <ul>
                              {[...Array(2).keys()].map(() => (
                                  <li class="bg-x-bg-tertiary my-1 h-16 animate-pulse rounded-md"></li>
                              ))}
                          </ul>
                      </li>
                  ))
                : dayColumns.map((dayColumn) => (
                      <li
                          key={dayColumn.label}
                          class={clsx('flex-col gap-2', dayColumn.items.length === 0 ? 'hidden sm:flex' : 'flex')}
                      >
                          <span
                              class={clsx(
                                  'flex flex-col items-center border-y-3 text-center text-base sm:text-xs md:text-sm lg:text-base',
                                  dayColumn.currentDateRelation === 'current'
                                      ? 'border-x-cta-primary bg-x-cta-darker font-bold'
                                      : 'font-semibold',
                                  dayColumn.items.length === 0 && 'italic opacity-50',
                                  isCurrentSchedulePeriodUpcoming &&
                                      dayColumn.currentDateRelation === 'past' &&
                                      'italic line-through opacity-50',
                              )}
                          >
                              <span class="truncate">{dayColumn.label}</span>
                              {currentHighlightOnlineOnlyDays && dayColumn.isOnlineOnly && (
                                  <span class="text-x-online-item-highlight text-xs font-semibold">
                                      {labels.online}
                                  </span>
                              )}
                          </span>
                          <ul class="flex flex-col gap-y-1">
                              {dayColumn.items.map((item, itemIndex) => {
                                  const isPastItem = item.end.date.getTime() < currentDate.getTime();
                                  const isFutureItem = item.start.date.getTime() > currentDate.getTime();

                                  const shouldRenderItemOutline =
                                      (!hasFutureItemOutlineBeenRendered && isFutureItem) ||
                                      (!isPastItem && !isFutureItem);
                                  hasFutureItemOutlineBeenRendered ||= isFutureItem;

                                  const previousItemDateDiff =
                                      itemIndex > 0
                                          ? item.start.date.getTime() -
                                            dayColumn.items[itemIndex - 1]!.end.date.getTime()
                                          : null;

                                  return (
                                      <Fragment key={item.id}>
                                          {currentShowLongBreaks &&
                                              previousItemDateDiff !== null &&
                                              previousItemDateDiff > LONG_BREAK_THRESHOLD && (
                                                  <div
                                                      class={clsx(
                                                          'bg-x-bg-tertiary sm:text-xxs border-x-warning-darker text-x-warning-darker w-full rounded-lg border-2 p-2 text-center text-sm transition-opacity md:text-xs lg:p-3 lg:text-sm',
                                                          isCurrentSchedulePeriodUpcoming &&
                                                              !isFutureItem &&
                                                              'opacity-50 hover:opacity-100',
                                                      )}
                                                  >
                                                      {labels.longBreakMessage(previousItemDateDiff)}
                                                  </div>
                                              )}
                                          <div
                                              class={clsx(
                                                  'sm:text-xxxs relative z-10 flex w-full flex-col gap-y-0.5 rounded-lg border-2 p-3 text-left text-xs transition-all hover:shadow-2xl sm:p-1.25 lg:p-2.5 lg:text-xs',
                                                  getScheduleItemTypeCategoryClass(item.type.category),
                                                  isCurrentSchedulePeriodUpcoming &&
                                                      isPastItem &&
                                                      'opacity-50 hover:opacity-100',
                                              )}
                                          >
                                              {shouldRenderItemOutline && (
                                                  <div
                                                      class={clsx(
                                                          'border-x-cta-darker pointer-events-none absolute -bottom-0.5 -left-0.5 flex h-[calc(100%+4px)] w-[calc(100%+4px)] justify-center rounded-lg border-4',
                                                          !isFutureItem && 'animate-pulse',
                                                      )}
                                                  >
                                                      <div class="bg-x-cta-darker pointer-events-auto h-min w-full py-1 text-center text-sm font-bold sm:text-xs md:text-sm">
                                                          {isFutureItem
                                                              ? formatItemRelativeTime(item.start.date, currentDate)
                                                              : labels.endOfScheduleItemMessage(
                                                                    formatItemRelativeTime(item.end.date, currentDate),
                                                                )}
                                                      </div>
                                                  </div>
                                              )}
                                              <span
                                                  class={clsx(
                                                      'sm:text-xxxs text-sm font-bold sm:font-black lg:text-xs lg:font-bold',
                                                      shouldRenderItemOutline && 'mt-6 md:mt-7',
                                                  )}
                                              >
                                                  {[item.subject, item.type.value].filter(Boolean).join(' - ')}
                                              </span>
                                              <div class="flex flex-wrap items-center gap-x-1">
                                                  <span class="font-semibold whitespace-nowrap">
                                                      {`${item.start.parts.toTimeString()}-${item.end.parts.toTimeString()} (${labels.durationHoursAndMinutesShort(item.end.date.getTime() - item.start.date.getTime())})`}
                                                  </span>
                                                  {item.room && item.isOnline && (
                                                      <span class="text-x-online-item-highlight font-semibold">
                                                          {labels.online}
                                                      </span>
                                                  )}
                                              </div>
                                              {item.room && !item.isOnline && (
                                                  <div class="flex items-center gap-1.5 sm:gap-1 lg:gap-2">
                                                      <Icon
                                                          name="pin"
                                                          class="h-3 w-3 shrink-0 sm:h-2 sm:w-2 lg:h-3 lg:w-3"
                                                      />
                                                      <span class="lg:not-hover:truncate">{item.room.name}</span>
                                                  </div>
                                              )}
                                              {(currentScheduleType !== 'lecturer' ||
                                                  query.data!.schedule.headers.length > 1) &&
                                                  item.lecturers.map((lecturer) => (
                                                      <div class="flex items-center gap-1.5 sm:gap-1 lg:gap-2">
                                                          <Icon
                                                              name="person"
                                                              class="h-3 w-3 shrink-0 sm:h-2 sm:w-2 lg:h-3 lg:w-3"
                                                          />

                                                          {lecturer.moodleId ? (
                                                              <a
                                                                  key={lecturer.name}
                                                                  href={createMoodleURL(lecturer.moodleId)}
                                                                  title={labels.eBusinessCardForX(lecturer.name)}
                                                                  target="_blank"
                                                                  class="focus-visible:outline-x-cta-primary active:text-x-text-default-muted transition-colors hover:underline focus-visible:outline-3 lg:not-hover:truncate"
                                                              >
                                                                  {lecturer.name}
                                                              </a>
                                                          ) : (
                                                              <span key={lecturer.name}>{lecturer.name}</span>
                                                          )}
                                                      </div>
                                                  ))}
                                              {currentScheduleType !== 'group' &&
                                                  item.groups.map((group) => (
                                                      <div
                                                          key={group}
                                                          class="flex items-center gap-1.5 sm:gap-1 lg:gap-2"
                                                      >
                                                          <Icon
                                                              name="group"
                                                              class="h-3 w-3 shrink-0 sm:h-2 sm:w-2 lg:h-3 lg:w-3"
                                                          />
                                                          <span>{group}</span>
                                                      </div>
                                                  ))}
                                              {item.room?.url && (
                                                  <Button
                                                      variant="tertiary"
                                                      icon="externalLink"
                                                      class="mt-1"
                                                      href={item.room.url}
                                                      text={item.room.name}
                                                  />
                                              )}
                                              {item.extra && (
                                                  <>
                                                      <hr class="border-x-bg-quinary my-1" />
                                                      <p class="text-x-text-error">{item.extra}</p>
                                                  </>
                                              )}
                                          </div>
                                      </Fragment>
                                  );
                              })}
                          </ul>
                      </li>
                  ))}
        </ul>
    );
};
