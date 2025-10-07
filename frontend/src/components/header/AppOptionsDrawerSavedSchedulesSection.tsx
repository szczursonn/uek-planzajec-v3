import clsx from 'clsx';
import { labels } from '../../lib/intl/labels';
import {
    hiddenSubjectsState,
    scheduleIdsState,
    scheduleTypeState,
    useAppScheduleQuery,
} from '../../lib/appScheduleQuery';
import { createSavedScheduleSelectionUpdaters, savedSchedulesState } from '../../lib/savedSchedules';
import { anchorPushStateHandler, useURLCreator } from '../../lib/state/queryParamsState';
import { Button } from '../common/Button';
import { AppOptionsDrawerSection } from './AppOptionsDrawerSection';

export const AppOptionsDrawerSavedSchedulesSection = () => {
    const query = useAppScheduleQuery();
    const currentSavedSchedules = savedSchedulesState.use();

    const currentScheduleIds = scheduleIdsState.use();
    const currentScheduleType = scheduleTypeState.use();
    const currentHiddenSubjects = hiddenSubjectsState.use();

    const currentlyActiveSavedSchedule = currentSavedSchedules.find(
        (savedSchedule) =>
            savedSchedule.type === currentScheduleType &&
            savedSchedule.headers.length === currentScheduleIds.length &&
            savedSchedule.headers.every((header, i) => header.id === currentScheduleIds[i]) &&
            savedSchedule.hiddenSubjects.length === currentHiddenSubjects.length &&
            savedSchedule.hiddenSubjects.every((hiddenSubject, i) => hiddenSubject === currentHiddenSubjects[i]),
    );

    const createURL = useURLCreator();

    return (
        <AppOptionsDrawerSection title={labels.savedSchedules}>
            {currentSavedSchedules.length === 0 && labels.noSavedSchedulesMessage}
            <div class="divide-x-bg-quaternary flex flex-col divide-y-2">
                {currentSavedSchedules.map((savedSchedule) => (
                    <a
                        class={clsx(
                            'focus-visible:outline-x-cta-primary p-2 text-sm hover:underline focus-visible:outline-2',
                            savedSchedule === currentlyActiveSavedSchedule && 'bg-x-bg-tertiary',
                        )}
                        href={createURL(...createSavedScheduleSelectionUpdaters(savedSchedule))}
                        onClick={anchorPushStateHandler}
                    >
                        <span>{savedSchedule.headers.map((header) => header.name).join(', ')}</span>

                        {savedSchedule.hiddenSubjects.length > 0 && (
                            <span class="text-xs"> +{labels.nHiddenSubjects(savedSchedule.hiddenSubjects.length)}</span>
                        )}
                    </a>
                ))}
            </div>

            <div class="mt-2 flex gap-2">
                {currentScheduleIds.length > 0 && (
                    <Button
                        disabled={!query.data || !!currentlyActiveSavedSchedule}
                        text={labels.saveCTA}
                        title={labels.saveScheduleCTA}
                        icon="save"
                        onClick={() =>
                            savedSchedulesState.add({
                                type: currentScheduleType,
                                headers: query.data!.schedule.headers.map((header) => ({
                                    id: header.id,
                                    name: header.name,
                                })),
                                hiddenSubjects: currentHiddenSubjects,
                            })
                        }
                    />
                )}
                {currentlyActiveSavedSchedule && (
                    <Button
                        text={labels.removeCTA}
                        title={labels.removeSavedScheduleCTA}
                        icon="cross"
                        onClick={() => savedSchedulesState.remove(currentlyActiveSavedSchedule)}
                    />
                )}
            </div>
        </AppOptionsDrawerSection>
    );
};
