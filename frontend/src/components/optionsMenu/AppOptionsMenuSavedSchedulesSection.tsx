import clsx from 'clsx';
import { labels } from '../../lib/labels';
import { createBooleanLocalStorageState } from '../../lib/localStorageState';
import { anchorClickPushStateHandler, useCreateURL } from '../../lib/queryParamState';
import { hiddenSubjectsAndTypesState, scheduleIdsState, scheduleTypeState } from '../../lib/useAppScheduleQuery';
import {
    createSavedScheduleSelectionUpdates,
    matchSavedSchedule,
    savedSchedulesState,
} from '../../lib/useSavedSchedules';
import { DropdownMenu, DropdownMenuButton, DropdownMenuLink } from '../common/DropdownMenu';
import { Icon } from '../common/Icon';
import { AppOptionsMenuCollapsibleSection } from './AppOptionsMenuCollapsibleSection';
import { Button } from '../common/Button';
import { isSaveScheduleModalOpenState } from '../modals/SaveScheduleModal';

const selectedSchedulesSectionCollapsedState = createBooleanLocalStorageState('appOptionsMenuSectionSaved', true);

export const AppOptionsMenuSavedSchedulesSection = () => {
    const scheduleIds = scheduleIdsState.use();
    const scheduleType = scheduleTypeState.use();
    const hiddenSubjectsAndTypes = hiddenSubjectsAndTypesState.use();

    const savedSchedules = savedSchedulesState.use();
    const currentlySelectedSavedSchedule = savedSchedules.find((savedSchedule) =>
        matchSavedSchedule(savedSchedule, {
            scheduleIds,
            scheduleType,
            hiddenSubjectsAndTypes,
        }),
    );
    const createURL = useCreateURL();

    const [isOpen, setIsOpen] = selectedSchedulesSectionCollapsedState.useAsInitial();

    return (
        <AppOptionsMenuCollapsibleSection
            title={labels.savedSchedules}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
        >
            <div class="flex flex-col">
                {savedSchedules.length === 0 && <div class="px-2 text-sm">{labels.noSavedSchedulesMessage}</div>}
                {savedSchedules.map((savedSchedule, i) => {
                    const isSelectedSavedSchedule = savedSchedule === currentlySelectedSavedSchedule;
                    const savedScheduleURL = createURL(...createSavedScheduleSelectionUpdates(savedSchedule));

                    return (
                        <div
                            key={savedSchedule.name}
                            class={clsx(
                                'flex items-center justify-between rounded-md px-2 transition-colors',
                                isSelectedSavedSchedule ? 'bg-back-tertiary' : 'hover:bg-back-tertiary',
                            )}
                        >
                            <a
                                class="flex-1 overflow-x-hidden py-2 text-ellipsis hover:underline md:py-1"
                                href={savedScheduleURL}
                                onClick={anchorClickPushStateHandler}
                            >
                                {savedSchedule.name}
                            </a>
                            <DropdownMenu
                                trigger={
                                    <Icon
                                        class="hover:bg-back-quaternary active:bg-back-quinary h-7 w-7 shrink-0 cursor-pointer rounded-full border-5 border-transparent transition-colors"
                                        name="threeDots"
                                    />
                                }
                            >
                                {i > 0 && (
                                    <DropdownMenuButton
                                        text={labels.moveUpCTA}
                                        icon="chevronUp"
                                        onClick={() => {
                                            const newSavedSchedules = [...savedSchedules];

                                            const replaced = newSavedSchedules[i - 1]!;
                                            newSavedSchedules[i - 1] = savedSchedule;
                                            newSavedSchedules[i] = replaced;

                                            savedSchedulesState.set(newSavedSchedules);
                                        }}
                                    />
                                )}
                                {i < savedSchedules.length - 1 && (
                                    <DropdownMenuButton
                                        text={labels.moveDownCTA}
                                        icon="chevronDown"
                                        onClick={() => {
                                            const newSavedSchedules = [...savedSchedules];

                                            const replaced = newSavedSchedules[i + 1]!;
                                            newSavedSchedules[i + 1] = savedSchedule;
                                            newSavedSchedules[i] = replaced;

                                            savedSchedulesState.set(newSavedSchedules);
                                        }}
                                    />
                                )}
                                {!isSelectedSavedSchedule && (
                                    <>
                                        <DropdownMenuLink
                                            text={labels.openInNewTab}
                                            icon="externalLink"
                                            href={savedScheduleURL}
                                        />
                                        <DropdownMenuButton
                                            text={labels.overwriteCTA}
                                            icon="save"
                                            onClick={() => {
                                                const newSavedSchedules = [...savedSchedules];

                                                newSavedSchedules[i] = {
                                                    ...newSavedSchedules[i]!,
                                                    ids: scheduleIds,
                                                    type: scheduleType,
                                                    hiddenSubjectsAndTypes,
                                                };

                                                savedSchedulesState.set(newSavedSchedules);
                                            }}
                                        />
                                    </>
                                )}
                                <DropdownMenuButton
                                    text={labels.removeCTA}
                                    title={labels.removeCTAx(savedSchedule.name)}
                                    icon="cross"
                                    onClick={() =>
                                        savedSchedulesState.set(savedSchedules.filter((s) => s !== savedSchedule))
                                    }
                                />
                            </DropdownMenu>
                        </div>
                    );
                })}

                {!currentlySelectedSavedSchedule && scheduleIds.length > 0 && (
                    <Button
                        class="mt-2"
                        variant="secondary"
                        text={labels.saveCTA}
                        icon="save"
                        href={createURL(isSaveScheduleModalOpenState.createUpdate(true))}
                        onClick={anchorClickPushStateHandler}
                    />
                )}
            </div>
        </AppOptionsMenuCollapsibleSection>
    );
};
