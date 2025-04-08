import { labels } from '../../lib/labels';
import { createBooleanLocalStorageState } from '../../lib/localStorageState';
import { anchorClickPushStateHandler, useCreateURL } from '../../lib/queryParamState';
import { createOfficialScheduleURL, MAX_SELECTABLE_SCHEDULES } from '../../lib/uek';
import { scheduleIdsState, scheduleTypeState, useAppScheduleQuery } from '../../lib/useAppScheduleQuery';
import { Button } from '../common/Button';
import { DropdownMenu, DropdownMenuLink } from '../common/DropdownMenu';
import { Icon } from '../common/Icon';
import { isExportModalOpenState } from '../modals/ExportModal';
import { isSelectModalOpenState } from '../modals/SimpleSelectModal';
import { AppOptionsMenuCollapsibleSection } from './AppOptionsMenuCollapsibleSection';

const selectedSchedulesSectionCollapsedState = createBooleanLocalStorageState('appOptionsMenuSectionSchedules', true);

export const AppOptionsMenuSelectedSchedulesSection = () => {
    const query = useAppScheduleQuery();
    const scheduleIds = scheduleIdsState.use();
    const scheduleType = scheduleTypeState.use();
    const createURL = useCreateURL();

    const [isOpen, setIsOpen] = selectedSchedulesSectionCollapsedState.useAsInitial();
    return (
        <AppOptionsMenuCollapsibleSection
            title={labels.byScheduleType[scheduleType].selected}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
        >
            <div class="flex flex-col">
                {query.isLoading ? (
                    <>
                        {[...Array(scheduleIds.length).keys()].map(() => (
                            <div class="bg-back-quaternary my-1 h-6 animate-pulse cursor-progress rounded-md" />
                        ))}
                    </>
                ) : (
                    <>
                        {scheduleIds.map((scheduleId, i) => {
                            const displayName = query.data?.headers[i]?.name ?? scheduleId.toString();

                            return (
                                <div
                                    key={scheduleId}
                                    class="hover:bg-back-tertiary flex items-center justify-between rounded-md px-2 transition-colors"
                                >
                                    <span class="py-2 md:py-1">{displayName}</span>
                                    <DropdownMenu
                                        trigger={
                                            <Icon
                                                class="hover:bg-back-quaternary active:bg-back-quinary h-7 w-7 shrink-0 cursor-pointer rounded-full border-5 border-transparent transition-colors"
                                                name="threeDots"
                                            />
                                        }
                                    >
                                        <DropdownMenuLink
                                            text={labels.officialSchedule}
                                            icon="externalLink"
                                            title={labels.officialScheduleFor(displayName)}
                                            href={createOfficialScheduleURL(scheduleType, scheduleId)}
                                        />
                                        <DropdownMenuLink
                                            text={labels.removeCTA}
                                            icon="cross"
                                            title={labels.removeCTAx(displayName)}
                                            href={createURL(
                                                scheduleIdsState.createUpdate(
                                                    scheduleIds.filter((id) => id !== scheduleId),
                                                ),
                                            )}
                                            onClick={anchorClickPushStateHandler}
                                        />
                                    </DropdownMenu>
                                </div>
                            );
                        })}
                    </>
                )}
                <div class="mt-1 flex flex-col gap-1.5">
                    <Button
                        variant="secondary"
                        text={labels.byScheduleType[scheduleType].addAnotherCTA}
                        icon="plus"
                        href={createURL(isSelectModalOpenState.createUpdate(true))}
                        disabled={scheduleIds.length >= MAX_SELECTABLE_SCHEDULES}
                        onClick={anchorClickPushStateHandler}
                    />
                    {scheduleIds.length > 0 && (
                        <Button
                            variant="secondary"
                            text={labels.exportCTA}
                            icon="export"
                            href={createURL(isExportModalOpenState.createUpdate(true))}
                            onClick={anchorClickPushStateHandler}
                        />
                    )}
                </div>
            </div>
        </AppOptionsMenuCollapsibleSection>
    );
};
