import { useEffect, useMemo } from 'preact/hooks';
import { LOCALE } from '../../lib/consts';
import { formatPartsTime } from '../../lib/dateTime';
import { labels } from '../../lib/labels';
import { Icon } from '../common/Icon';
import { Modal } from './Modal';
import eBusinessCardImage from '../../assets/eBusinessCard.jpg';
import { Button } from '../common/Button';
import { createMoodleURL, ScheduleItem, ScheduleItemCategory } from '../../lib/uek';
import {
    anchorClickPushStateHandler,
    createStringQueryParamState,
    updateQueryParams,
    useCreateURL,
} from '../../lib/queryParamState';
import { useAppScheduleQuery } from '../../lib/useAppScheduleQuery';
import { subjectDetailsSubjectState } from './SubjectDetailsModal';

const fullDateFormatter = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
});

const getScheduleItemCategoryClass = (itemCategory: ScheduleItemCategory | null) => {
    switch (itemCategory) {
        case 'lecture':
            return 'border-sky-600';
        case 'exercise':
            return 'border-amber-600';
        case 'language':
            return 'border-green-600';
        case 'languageSlot':
            return 'border-green-600';
        case 'exam':
            return 'border-red-600';
    }
};

export const itemDetailsModalItemIdState = createStringQueryParamState('itemDetails');

export const ItemDetailsModalHost = () => {
    const query = useAppScheduleQuery();
    const itemId = itemDetailsModalItemIdState.use();

    const item = useMemo(() => query.data?.items.find((item) => item.id === itemId), [query.data?.items, itemId]);

    useEffect(() => {
        if (query.data && itemId && !item) {
            updateQueryParams('replaceState', itemDetailsModalItemIdState.createUpdate(''));
        }
    }, [query.data, itemId, item]);

    return itemId ? <ItemDetailsModal item={item} /> : <></>;
};

const ItemDetailsModal = ({ item }: { item?: ScheduleItem }) => {
    const createURL = useCreateURL();

    return (
        <Modal
            borderClass={getScheduleItemCategoryClass(item?.category ?? null)}
            onClose={() => updateQueryParams('pushState', itemDetailsModalItemIdState.createUpdate(''))}
        >
            {item && (
                <div class="p-2 md:max-w-150 md:p-0">
                    <p class="mr-12 text-lg font-semibold">
                        {[item.subject, item.category !== 'languageSlot' && item.type].filter(Boolean).join(' - ')}
                    </p>

                    <p class="mr-12 mb-5 flex flex-col text-sm md:flex-row md:gap-2">
                        <span>{fullDateFormatter.format(item.start.date)}</span>
                        <span class="hidden md:block">⋅</span>
                        <span>{`${formatPartsTime(item.start.localParts)} - ${formatPartsTime(item.end.localParts)} (${labels.durationHoursAndMinutesShort(item.end.date.getTime() - item.start.date.getTime())})`}</span>
                    </p>

                    <div class="grid grid-cols-12 gap-x-1 gap-y-3 text-sm">
                        {item.room && (
                            <>
                                <Icon name="pin" class="col-span-1 mx-auto h-6 w-6" />
                                <span class="col-span-11">{item.room.url ? labels.online : item.room.name}</span>
                            </>
                        )}
                        {item.lecturers.map((lecturer) => (
                            <>
                                <img class="m-auto h-4" src={eBusinessCardImage} alt={labels.eBusinessCard} />
                                <span class="col-span-11">{lecturer.name}</span>
                            </>
                        ))}

                        <Icon name="group" class="col-span-1 mx-auto h-6 w-6" />
                        <span class="col-span-11">{item.groups.join(', ')}</span>

                        {item.extra && (
                            <>
                                <Icon name="alert" class="text-error col-span-1 mx-auto h-6 w-6" />
                                <span class="text-error col-span-11 font-semibold">{item.extra}</span>
                            </>
                        )}
                    </div>

                    <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {item.room && item.room.url && (
                            <Button
                                variant="cta"
                                href={item.room.url}
                                text={item.room.name}
                                icon="externalLink"
                                iconSize="medium"
                            />
                        )}
                        {item.lecturers
                            .filter((lecturer) => lecturer.moodleId)
                            .map((lecturer) => (
                                <Button
                                    variant="tertiary"
                                    href={createMoodleURL(lecturer.moodleId!)}
                                    text={`${labels.eBusinessCard}: ${lecturer.name}`}
                                    class="text-sm"
                                    icon="externalLink"
                                    iconSize="medium"
                                />
                            ))}
                        {item.subject && (
                            <Button
                                variant="tertiary"
                                href={createURL(
                                    itemDetailsModalItemIdState.createUpdate(''),
                                    subjectDetailsSubjectState.createUpdate(item.subject),
                                )}
                                text={`${labels.details}: ${item.subject}`}
                                class="text-sm"
                                icon="info"
                                iconSize="medium"
                                onClick={anchorClickPushStateHandler}
                            />
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};
