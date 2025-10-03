import { useMemo } from 'preact/hooks';
import clsx from 'clsx';
import { labels } from '../../lib/intl/labels';
import { LOCALE } from '../../lib/intl/locale';
import { updateQueryParams, createStringQueryParamState } from '../../lib/state/queryParamsState';
import { stripTime } from '../../lib/date/dateUtils';
import { useCurrentDate } from '../../lib/date/useCurrentDate';
import { TIME_ZONE } from '../../lib/date/timeZone';
import { createMoodleURL } from '../../lib/api/common';
import { getScheduleItemTypeCategory } from '../../lib/api/aggregateSchedule';
import { useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { Button } from '../common/Button';
import { Modal } from './Modal';

const itemDateFormatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE.UEK,
    day: 'numeric',
    month: 'long',
});

const daysFromNowFormatter = new Intl.RelativeTimeFormat(LOCALE, {
    numeric: 'auto',
    style: 'long',
});

const getItemTypeTextClass = (itemType: string) => {
    switch (getScheduleItemTypeCategory(itemType)) {
        case 'lecture':
            return 'text-sky-400';
        case 'exercise':
            return 'text-amber-400';
        case 'language':
            return 'text-green-400';
        case 'exam':
            return 'text-red-400';
        case 'cancelled':
            return 'text-zinc-400';
        default:
            return '';
    }
};

const IGNORED_CATEGORIES = ['cancelled', 'reservation'] as Readonly<string[]>;

export const subjectDetailsModalSubjectState = createStringQueryParamState('subjectDetails');

export const SubjectDetailsModalHost = () => {
    const subject = subjectDetailsModalSubjectState.use();
    if (!subject) {
        return null;
    }

    return <SubjectDetailsModal subject={subject} />;
};

const SubjectDetailsModal = ({ subject }: { subject: string }) => {
    const query = useAppScheduleQuery();
    const currentDate = useCurrentDate('minute');
    const currentDateWithoutTime = stripTime(currentDate);

    const allSubjectItems = useMemo(
        () => query.data?.schedule.items.filter((item) => item.subject === subject) ?? [],
        [query.data?.schedule.items, subject],
    );

    const itemTypeInfos = useMemo(() => {
        const itemTypeToInfo = {} as Record<
            string,
            { remainingCount: number; remainingDuration: number; totalDuration: number }
        >;

        for (const item of allSubjectItems) {
            if (IGNORED_CATEGORIES.includes(item.type.category)) {
                continue;
            }

            itemTypeToInfo[item.type.value] = itemTypeToInfo[item.type.value] ?? {
                remainingCount: 0,
                remainingDuration: 0,
                totalDuration: 0,
            };
            const itemTypeInfo = itemTypeToInfo[item.type.value]!;

            const itemDuration = item.end.date.getTime() - item.start.date.getTime();
            itemTypeInfo.totalDuration += itemDuration;
            if (item.end.date.getTime() > currentDate.getTime()) {
                itemTypeInfo.remainingCount++;
                itemTypeInfo.remainingDuration += itemDuration;
            }
        }

        return Object.entries(itemTypeToInfo)
            .map(([itemType, info]) => ({ itemType, ...info }))
            .sort((a, b) => a.itemType.localeCompare(b.itemType));
    }, [allSubjectItems, currentDate.getTime()]);

    const lecturerInfos = useMemo(() => {
        const lecturerNameToLecturerInfo = {} as Record<
            string,
            {
                moodleId?: number;
                itemTypes: Set<string>;
            }
        >;

        for (const item of allSubjectItems) {
            if (IGNORED_CATEGORIES.includes(item.type.category)) {
                continue;
            }

            for (const lecturer of item.lecturers) {
                lecturerNameToLecturerInfo[lecturer.name] = lecturerNameToLecturerInfo[lecturer.name] ?? {
                    moodleId: lecturer.moodleId,
                    itemTypes: new Set(),
                };

                lecturerNameToLecturerInfo[lecturer.name]!.itemTypes.add(item.type.value);
            }
        }

        return Object.entries(lecturerNameToLecturerInfo)
            .map(([lecturerName, { moodleId, itemTypes }]) => ({
                name: lecturerName,
                moodleURL: moodleId ? createMoodleURL(moodleId) : null,
                itemTypes: Array.from(itemTypes).sort((a, b) => a.localeCompare(b)),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allSubjectItems]);

    const allItemsGroups = useMemo(
        () =>
            Array.from(
                allSubjectItems.reduce((set, item) => {
                    item.groups.forEach((group) => set.add(group));
                    return set;
                }, new Set<string>()),
            ).sort((a, b) => a.localeCompare(b)),
        [allSubjectItems],
    );

    return (
        <Modal
            title={subject}
            onClose={() => updateQueryParams('pushState', subjectDetailsModalSubjectState.createUpdate(''))}
        >
            <div class="flex flex-col lg:grid lg:grid-cols-2">
                <div class="border-r-x-bg-quinary lg:border-r-2 lg:pr-2">
                    <p class="text-lg font-semibold md:text-xl">{labels.subjectDetailsRemainingSectionHeader}</p>
                    {itemTypeInfos.map((itemTypeInfo) => (
                        <p key={itemTypeInfo.itemType} class="text-sm">
                            <span class="font-semibold">{`${itemTypeInfo.remainingCount}x `}</span>
                            <span class={getItemTypeTextClass(itemTypeInfo.itemType)}>{itemTypeInfo.itemType}</span>
                            <span>{` - ${labels.timeXOutOfY(itemTypeInfo.remainingDuration, itemTypeInfo.totalDuration)}`}</span>
                        </p>
                    ))}
                </div>
                <hr class="border-x-bg-quinary my-2 lg:hidden" />
                <div class="divide-x-bg-quinary flex flex-col lg:gap-1 lg:pl-2">
                    <p class="text-lg font-semibold md:text-xl">{labels.subjectDetailsLecturersSectionHeader}</p>
                    {lecturerInfos.map((lecturerInfo) => (
                        <div key={lecturerInfo.name} class="flex flex-col py-1">
                            <div class="flex items-center gap-2">
                                <span class="text-sm lg:text-base">- {lecturerInfo.name}</span>
                                {lecturerInfo.moodleURL !== null && (
                                    <Button
                                        class="max-w-8"
                                        icon="externalLink"
                                        title={labels.eBusinessCardForX(lecturerInfo.name)}
                                        href={lecturerInfo.moodleURL}
                                    />
                                )}
                            </div>
                            <div class="mt-1 flex">
                                {lecturerInfo.itemTypes.map((itemType) => (
                                    <span
                                        class={clsx(
                                            'not-first:border-l-x-bg-quinary text-xs not-first:ml-1 not-first:border-l-2 not-first:pl-1 lg:text-sm lg:not-first:ml-2 lg:not-first:pl-2',
                                            getItemTypeTextClass(itemType),
                                        )}
                                    >
                                        {itemType}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    <p class="text-lg font-semibold md:text-xl">{labels.subjectDetailsGroupsSectionHeader}</p>
                    {allItemsGroups.map((group) => (
                        <p key={group}>- {group}</p>
                    ))}
                </div>
            </div>

            <p class="border-t-x-bg-quinary mt-2 border-t-2 pt-2 text-lg font-semibold">
                {labels.subjectDetailsItemListHeader}
            </p>
            <div class="focus-visible:outline-x-cta-primary overflow-y-auto rounded-md text-xs focus-visible:outline-2 sm:text-sm md:text-base lg:max-h-75">
                {allSubjectItems.length === 0 && labels.noScheduleItemsMessage}
                {allSubjectItems.map((item) => (
                    <div
                        key={item.id}
                        class={clsx(
                            'hover:border-x-bg-quinary grid grid-cols-10 items-center gap-y-3 rounded border-2 border-transparent p-0.5 transition-all md:p-1',
                        )}
                    >
                        <p class="col-span-3">
                            <span>{itemDateFormatter.format(item.start.date)}</span>
                            <br class="sm:hidden" />
                            <span class="text-xxs lg:text-xs">
                                {` (${daysFromNowFormatter.format(
                                    Math.round(
                                        (item.start.parts.stripTime().toDate().getTime() -
                                            currentDateWithoutTime.getTime()) /
                                            (1000 * 60 * 60 * 24),
                                    ),
                                    'days',
                                )})`}
                            </span>
                        </p>
                        <p
                            class={clsx(
                                'col-span-4 mx-2 border-x-2 px-2',
                                item.end.date.getTime() < currentDate.getTime()
                                    ? 'border-x-bg-quinary'
                                    : 'border-x-cta-darker',
                            )}
                        >
                            <span>
                                {item.start.parts.toTimeString()}-{item.end.parts.toTimeString()}
                            </span>
                            <span class="text-xs">
                                {` (${labels.durationHoursAndMinutesShort(
                                    item.end.date.getTime() - item.start.date.getTime(),
                                )})`}
                            </span>
                        </p>
                        <p class={clsx('col-span-3', getItemTypeTextClass(item.type.value))}>{item.type.value}</p>
                    </div>
                ))}
            </div>
        </Modal>
    );
};
