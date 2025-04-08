import { useMemo } from 'preact/hooks';
import { Fragment } from 'preact/jsx-runtime';
import clsx from 'clsx';
import { ScheduleItem, ScheduleItemCategory } from '../../lib/uek';
import { LOCALE, LONG_BREAK_THRESHOLD, TIME_ZONE } from '../../lib/consts';
import { schedulePeriodState, showLongBreaksState, useAppScheduleQuery } from '../../lib/useAppScheduleQuery';
import { useDynamicNow } from '../../lib/useDynamicNow';
import {
    areDatePartsEqualWithoutTime,
    compareDatePartsWithoutTime,
    eachLocalDatePartsBetween,
    formatPartsTime,
    getClosestFutureSunday,
    getClosestPastMonday,
    getDateFromLocalParts,
    getLocalDatePartsFromDate,
    LocalDateParts,
} from '../../lib/dateTime';
import { labels } from '../../lib/labels';
import { itemDetailsModalItemIdState } from '../modals/ItemDetailsModal';
import { updateQueryParams } from '../../lib/queryParamState';

const getScheduleItemCategoryClass = (itemCategory?: ScheduleItemCategory | null) => {
    switch (itemCategory) {
        case 'lecture':
            return 'bg-sky-800 border-sky-900 hover:shadow-sky-700/25';
        case 'exercise':
            return 'bg-amber-800 border-amber-900 hover:shadow-amber-700/25';
        case 'language':
            return 'bg-green-700 border-green-900 hover:shadow-green-700/25';
        case 'languageSlot':
            return 'bg-zinc-800 border-green-700 hover:shadow-green-800/25';
        case 'exam':
            return 'bg-red-700 border-red-900 hover:shadow-red-700/25';
        case 'cancelled':
            return 'bg-zinc-800 border-zinc-900 text-zinc-400 hover:shadow-zinc-800/25';
        default:
            return 'bg-zinc-800 border-zinc-900 hover:shadow-zinc-800/25';
    }
};

const groupLabelFormatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
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

    // Mnutes format is shown below 2h30m
    if (minutesAbs < 150) {
        return relativeTimeFormatter.format(minutes, 'minutes');
    }

    if (minutesAbs < 1440) {
        return relativeTimeFormatter.format(Math.round(minutes / 60), 'hours');
    }

    return relativeTimeFormatter.format(Math.round(minutes / 1440), 'days');
};

export const ScheduleViewWeek = () => {
    const scheduleQuery = useAppScheduleQuery();
    const isUpcomingPeriod = schedulePeriodState.use() === 'upcoming';

    const now = useDynamicNow('minute');
    const dayColumns = useMemo(() => {
        const items = scheduleQuery.data?.filteredItems ?? [];

        const itemsGroupedByDay: {
            localParts: LocalDateParts;
            items: ScheduleItem[];
        }[] = [];

        if (items.length > 0) {
            let itemIndex = 0;
            for (const currentDateParts of eachLocalDatePartsBetween(
                getLocalDatePartsFromDate(getClosestPastMonday(isUpcomingPeriod ? now : items[0]!.start.date)),
                getLocalDatePartsFromDate(
                    getClosestFutureSunday(new Date(Math.max(items.at(-1)!.start.date.getTime(), now.getTime()))),
                ),
            )) {
                itemsGroupedByDay.push({
                    localParts: currentDateParts,
                    items: [],
                });

                while (itemIndex < items.length) {
                    const item = items[itemIndex]!;
                    if (!areDatePartsEqualWithoutTime(item.start.localParts, currentDateParts)) {
                        break;
                    }

                    itemsGroupedByDay.at(-1)!.items.push(item);
                    itemIndex++;
                }
            }
        }

        const nowParts = getLocalDatePartsFromDate(now);
        const dayColumns: {
            label: string;
            nowRelation: 'past' | 'current' | 'future';
            items: ScheduleItem[];
        }[] = [];

        for (let i = 0; i < itemsGroupedByDay.length; i++) {
            const currentDayItemsGroup = itemsGroupedByDay[i]!;
            const compareNowResult = compareDatePartsWithoutTime(currentDayItemsGroup.localParts, nowParts);

            dayColumns.push({
                label: groupLabelFormatter.format(getDateFromLocalParts(currentDayItemsGroup.localParts)),
                nowRelation: compareNowResult === -1 ? 'past' : compareNowResult === 0 ? 'current' : 'future',
                items: currentDayItemsGroup.items,
            });
        }

        return dayColumns;
    }, [scheduleQuery.data?.filteredItems, isUpcomingPeriod, now.getTime()]);

    const showLongBreaks = showLongBreaksState.use();
    let hasFutureItemOutlineBeenRendered = false;

    return (
        <ul
            class={clsx(
                '3xl:px-[7.5%] grid w-full grid-cols-1 gap-x-1 gap-y-4 p-4 sm:grid-cols-7 sm:gap-x-2 sm:gap-y-10 xl:px-[5%]',
            )}
        >
            {dayColumns.map((dayColumn) => (
                <li
                    key={dayColumn.label}
                    class={clsx('flex-col gap-2', dayColumn.items.length === 0 ? 'hidden sm:flex' : 'flex')}
                >
                    <span
                        class={clsx(
                            'flex flex-col items-center truncate border-y-2 text-base sm:text-xs md:text-sm lg:text-base',
                            dayColumn.nowRelation === 'current' &&
                                'border-cta-primary-darker bg-cta-primary-darker font-bold',
                            isUpcomingPeriod && dayColumn.nowRelation === 'past' && 'italic opacity-60',
                        )}
                    >
                        {dayColumn.label}
                    </span>
                    <div class="flex flex-col gap-y-1">
                        {dayColumn.items.map((item, itemIndex) => {
                            const isPastItem = item.end.date.getTime() < now.getTime();
                            const isFutureItem = item.start.date.getTime() > now.getTime();

                            const shouldRenderItemOutline =
                                (!hasFutureItemOutlineBeenRendered && isFutureItem) || (!isPastItem && !isFutureItem);
                            hasFutureItemOutlineBeenRendered ||= isFutureItem;

                            const previousItemDateDiff =
                                itemIndex > 0
                                    ? item.start.date.getTime() - dayColumn.items[itemIndex - 1]!.end.date.getTime()
                                    : null;

                            return (
                                <Fragment key={item.id}>
                                    {showLongBreaks &&
                                        previousItemDateDiff !== null &&
                                        previousItemDateDiff > LONG_BREAK_THRESHOLD && (
                                            <div
                                                class={clsx(
                                                    'text-warning border-warning-darker bg-back-tertiary sm:text-xxs w-full rounded-lg border-2 p-2 text-center text-sm transition-opacity md:text-xs lg:p-3 lg:text-sm',
                                                    isUpcomingPeriod &&
                                                        item.start.date.getTime() < now.getTime() &&
                                                        'opacity-50 hover:opacity-100',
                                                )}
                                            >
                                                {labels.longBreakMessage(previousItemDateDiff)}
                                            </div>
                                        )}
                                    <button
                                        class={clsx(
                                            'sm:text-xxs relative flex w-full flex-col gap-y-[1px] rounded-lg border-2 p-3 text-left text-xs transition-all hover:cursor-pointer hover:shadow-xl active:scale-100 sm:p-1.5 md:active:scale-100 lg:p-2 lg:text-xs',
                                            getScheduleItemCategoryClass(item.category),
                                            'hover:z-10 hover:scale-105 md:hover:scale-110',
                                            isUpcomingPeriod && isPastItem && 'opacity-50 hover:opacity-100',
                                        )}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateQueryParams(
                                                'pushState',
                                                itemDetailsModalItemIdState.createUpdate(item.id),
                                            );
                                        }}
                                    >
                                        {shouldRenderItemOutline && (
                                            <div
                                                class={clsx(
                                                    'border-cta-primary-darker pointer-events-none absolute -bottom-0.5 -left-0.5 flex h-[calc(100%+4px)] w-[calc(100%+4px)] justify-center rounded-lg border-4',
                                                    !isFutureItem && 'animate-pulse',
                                                )}
                                            >
                                                <div class="bg-cta-primary-darker pointer-events-auto h-min w-full py-1 text-center text-sm font-bold first-letter:capitalize sm:text-xs md:text-sm">
                                                    {isFutureItem
                                                        ? formatItemRelativeTime(item.start.date, now)
                                                        : `${labels.end}: ${formatItemRelativeTime(item.end.date, now)}`}
                                                </div>
                                            </div>
                                        )}

                                        <span
                                            class={clsx(
                                                'sm:text-xxs text-sm font-bold sm:break-all lg:text-xs lg:break-normal',
                                                shouldRenderItemOutline && 'mt-6 md:mt-7',
                                            )}
                                        >
                                            {[item.subject, item.category !== 'languageSlot' && item.type]
                                                .filter(Boolean)
                                                .join(' - ')}
                                        </span>
                                        <div class="flex flex-wrap items-center gap-x-1 lg:flex-nowrap">
                                            <span class="whitespace-nowrap">
                                                {`${formatPartsTime(item.start.localParts)}-${formatPartsTime(item.end.localParts)}`}
                                            </span>
                                            {item.room &&
                                                item.category !== 'languageSlot' &&
                                                (item.room.url || item.room.name === 'Platforma Moodle' ? (
                                                    <span class="font-semibold text-cyan-200">{labels.online}</span>
                                                ) : (
                                                    <span
                                                        class="overflow-hidden overflow-ellipsis whitespace-nowrap"
                                                        title={item.room.name}
                                                    >
                                                        {labels.scheduleItemInRoom(item.room.name)}
                                                    </span>
                                                ))}
                                        </div>
                                        {item.extra && (
                                            <>
                                                <hr class="my-1 border-zinc-500" />
                                                <p class="text-error">{item.extra}</p>
                                            </>
                                        )}
                                    </button>
                                </Fragment>
                            );
                        })}
                    </div>
                </li>
            ))}
        </ul>
    );
};

export const ScheduleViewWeekSkeleton = () => (
    <ul class="3xl:px-[10%] grid w-full grid-cols-1 gap-x-1 gap-y-4 p-4 sm:gap-y-10 md:grid-cols-7 md:gap-x-2 xl:px-[5%]">
        {[...Array(7 * 4).keys()].map(() => (
            <li class="cursor-progress">
                <span class="bg-back-quaternary my-3 flex h-8 animate-pulse rounded-md"></span>
                <ul>
                    {[...Array(2).keys()].map(() => (
                        <li class="bg-back-tertiary my-1 h-16 animate-pulse rounded-md"></li>
                    ))}
                </ul>
            </li>
        ))}
    </ul>
);
