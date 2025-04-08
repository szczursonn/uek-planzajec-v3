import { useMemo } from 'preact/hooks';
import clsx from 'clsx';
import {
    anchorClickPushStateHandler,
    createStringQueryParamState,
    updateQueryParams,
    useCreateURL,
} from '../../lib/queryParamState';
import { useAppScheduleQuery } from '../../lib/useAppScheduleQuery';
import { Modal } from './Modal';
import { useDynamicNow } from '../../lib/useDynamicNow';
import { labels } from '../../lib/labels';
import { LOCALE, TIME_ZONE } from '../../lib/consts';
import { itemDetailsModalItemIdState } from './ItemDetailsModal';
import { SCHEDULE_ITEM_TYPE_TO_CATEGORY, ScheduleItemCategory } from '../../lib/uek';
import { unicodeAwareStringArraySorter } from '../../lib/utils';
import { Button } from '../common/Button';

const itemDateFormatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
});

const daysFromNowFormatter = new Intl.RelativeTimeFormat(LOCALE, {
    numeric: 'auto',
    style: 'long',
});

const getItemCategoryTextClass = (itemCategory?: ScheduleItemCategory | null) => {
    switch (itemCategory) {
        case 'lecture':
            return 'text-sky-400';
        case 'exercise':
            return 'text-amber-400';
        case 'language':
            return 'text-green-400';
        case 'languageSlot':
            return 'text-green-400';
        case 'exam':
            return 'text-red-400';
        case 'cancelled':
            return 'text-zinc-400';
        default:
            return '';
    }
};

const CATEGORIES_TO_IGNORE_FOR_DURATION = ['languageSlot', 'cancelled', 'reservation'] as Readonly<
    ScheduleItemCategory[]
>;

export const subjectDetailsSubjectState = createStringQueryParamState('subjectDetails');

export const SubjectDetailsModalHost = () => (subjectDetailsSubjectState.use() ? <SubjectDetailsModal /> : <></>);

const SubjectDetailsModal = () => {
    const query = useAppScheduleQuery();
    const now = useDynamicNow('minute');
    const subject = subjectDetailsSubjectState.use();

    const allSubjectItems = useMemo(
        () => query.data?.items.filter((item) => item.subject === subject) ?? [],
        [query.data, subject],
    );

    const itemTypeInfos = useMemo(() => {
        const itemTypeToInfo = {} as Record<
            string,
            { totalCount: number; totalDuration: number; remainingCount: number; remainingDuration: number }
        >;

        for (const item of allSubjectItems) {
            if (!item.category || CATEGORIES_TO_IGNORE_FOR_DURATION.includes(item.category)) {
                continue;
            }

            itemTypeToInfo[item.type] = itemTypeToInfo[item.type] ?? {
                totalCount: 0,
                totalDuration: 0,
                remainingCount: 0,
                remainingDuration: 0,
            };
            const itemTypeInfo = itemTypeToInfo[item.type]!;

            const itemDuration = item.end.date.getTime() - item.start.date.getTime();
            itemTypeInfo.totalCount++;
            itemTypeInfo.totalDuration += itemDuration;
            if (item.end.date.getTime() > now.getTime()) {
                itemTypeInfo.remainingCount++;
                itemTypeInfo.remainingDuration += itemDuration;
            }
        }

        return Object.entries(itemTypeToInfo)
            .map(([itemType, info]) => ({ itemType, ...info }))
            .sort((a, b) => unicodeAwareStringArraySorter(a.itemType, b.itemType));
    }, [allSubjectItems, now]);

    const createURL = useCreateURL();

    return (
        <Modal
            title={subject}
            onClose={() => updateQueryParams('pushState', subjectDetailsSubjectState.createUpdate(''))}
        >
            {query.isLoading && <span>{labels.loading}</span>}

            <p class="text-lg font-semibold md:text-xl">{labels.remaining}:</p>
            {itemTypeInfos.map((info) => (
                <p key={info.itemType} class="text-sm">
                    <span class="font-semibold">{`${info.remainingCount}x `}</span>
                    <span class={getItemCategoryTextClass(SCHEDULE_ITEM_TYPE_TO_CATEGORY[info.itemType])}>
                        {info.itemType}
                    </span>
                    <span>{` - ${labels.timeXOutOfY(info.remainingDuration, info.totalDuration)}`}</span>
                </p>
            ))}

            <hr class="border-back-quinary mt-2 mb-1 md:mt-4 md:mb-2" />
            <p class="mb-2 text-lg font-semibold md:mb-0">{labels.listOfScheduleItems}</p>
            <div class="max-h-75 overflow-y-auto text-xs sm:text-sm md:max-h-100 md:text-base">
                {allSubjectItems.map((item) => (
                    <div
                        key={item.id}
                        class={clsx(
                            'hover:border-back-quaternary grid grid-cols-10 items-center gap-3 rounded border-2 border-transparent p-0.5 transition-colors md:p-1',
                            item.end.date.getTime() < now.getTime() &&
                                'opacity-60 transition-opacity hover:opacity-100',
                        )}
                    >
                        <p class="col-span-3">
                            <span>{itemDateFormatter.format(item.start.date)}</span>
                            <span class="text-xxs md:text-xs">
                                {' (' +
                                    daysFromNowFormatter.format(
                                        Math.round((item.start.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
                                        'days',
                                    ) +
                                    ')'}
                            </span>
                        </p>
                        <p class={clsx(getItemCategoryTextClass(item.category), 'col-span-3')}>{item.type}</p>
                        <p class="col-span-2">
                            {labels.durationHoursAndMinutesShort(item.end.date.getTime() - item.start.date.getTime())}
                        </p>
                        <Button
                            variant="tertiary"
                            class="text-xxs col-span-2 md:text-xs"
                            text={labels.details}
                            href={createURL(
                                subjectDetailsSubjectState.createUpdate(''),
                                itemDetailsModalItemIdState.createUpdate(item.id),
                            )}
                            onClick={anchorClickPushStateHandler}
                        />
                    </div>
                ))}
            </div>
        </Modal>
    );
};
