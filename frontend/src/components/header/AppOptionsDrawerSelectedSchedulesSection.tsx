import clsx from 'clsx';
import { labels } from '../../lib/intl/labels';
import { createOfficialScheduleURL } from '../../lib/api/common';
import { MAX_SELECTABLE_SCHEDULES } from '../../lib/api/aggregateSchedule';
import { scheduleIdsState, scheduleTypeState, useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { anchorPushStateHandler, useURLCreator } from '../../lib/state/queryParamsState';
import { RoundIconButton } from '../common/RoundIconButton';
import { AppOptionsDrawerSection } from './AppOptionsDrawerSection';
import { AppOptionsShareButton } from './AppOptionsShareButton';
import { AppOptionsExportButton } from './AppOptionsExportButton';
import { selectorModalOpenState } from '../modals/ScheduleSelectorModal';

export const AppOptionsDrawerSelectedSchedulesSection = () => {
    const query = useAppScheduleQuery();
    const currentScheduleIds = scheduleIdsState.use();
    const currentScheduleType = scheduleTypeState.use();

    const createDerivedURL = useURLCreator();

    return (
        <AppOptionsDrawerSection title={labels.selectedScheduleSectionNames[currentScheduleType]}>
            {Array.from(Array(MAX_SELECTABLE_SCHEDULES).keys()).map((i) => {
                const scheduleId = currentScheduleIds[i];
                const scheduleDisplayName = query.data?.headers[i]?.name || currentScheduleIds[i]?.toString() || '';

                return (
                    <div
                        class={clsx(
                            'border-x-bg-quinary flex w-full justify-between p-1.25',
                            i === 0 ? 'rounded-t-md border-2' : 'border-x-2 border-b-2',
                            i === MAX_SELECTABLE_SCHEDULES - 1 && 'rounded-b-md',
                        )}
                    >
                        {scheduleId === undefined ? (
                            <span class="text-x-text-default-muted">{labels.emptySlot}</span>
                        ) : query.isLoading ? (
                            <span class="animate-pulse">...</span>
                        ) : (
                            <span class={clsx(!!query.error && 'text-x-text-error')} title={scheduleDisplayName}>
                                {scheduleDisplayName}
                            </span>
                        )}

                        <div class="text-x-text-default-muted flex">
                            {scheduleId === undefined ? (
                                <RoundIconButton
                                    class="text-x-text-default-muted h-7 p-0.75"
                                    icon="plus"
                                    title={labels.addScheduleCTA}
                                    href={createDerivedURL(selectorModalOpenState.createUpdate(true))}
                                    onClick={anchorPushStateHandler}
                                />
                            ) : (
                                <>
                                    <RoundIconButton
                                        class="h-7 p-1"
                                        icon="externalLink"
                                        title={labels.officialScheduleFor(scheduleDisplayName)}
                                        href={createOfficialScheduleURL(currentScheduleType, scheduleId)}
                                    />
                                    <RoundIconButton
                                        class="h-7 p-1"
                                        icon="cross"
                                        title={labels.removeXCTA(scheduleDisplayName)}
                                        href={createDerivedURL(scheduleIdsState.createRemoveUpdater(scheduleId))}
                                        onClick={anchorPushStateHandler}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
            <div class="mt-2 flex gap-2 xl:hidden">
                <AppOptionsShareButton />
                <AppOptionsExportButton />
            </div>
        </AppOptionsDrawerSection>
    );
};
