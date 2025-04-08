import clsx from 'clsx';
import { appVersion } from 'virtual:version-info';
import { scheduleIdsState } from '../../lib/useAppScheduleQuery';
import { AppOptionsMenuSchedulePeriodPicklist } from './AppOptionsMenuSchedulePeriodPicklist';
import { AppOptionsMenuHorizontalLine } from './AppOptionsMenuHorizontalLine';
import { AppOptionsMenuSavedSchedulesSection } from './AppOptionsMenuSavedSchedulesSection';
import { AppOptionsMenuSelectedSchedulesSection } from './AppOptionsMenuSelectedSchedulesSection';
import { AppOptionsMenuShowLanguageSlotsCheckbox } from './AppOptionsMenuShowLanguageSlotsCheckbox';
import { AppOptionsMenuHiddenSubjectsAndTypesSection } from './AppOptionsMenuSubjectsAndTypesSection';
import { AppOptionsMenuShowLongBreaksCheckbox } from './AppOptionsMenuShowLongBreaksCheckbox';
import { AppOptionsMenuInitialSelectButton } from './AppOptionsMenuInitialSelectButton';

// desktop: sidebar, mobile: topbar

export const AppOptionsMenu = ({ isOpen }: { isOpen: boolean }) => {
    const scheduleIds = scheduleIdsState.use();

    return (
        <aside
            class={clsx(
                'bg-back-secondary border-b-back-tertiary lg:border-r-back-tertiary fixed top-0 z-20 h-3/4 w-full border-b-2 pt-16 shadow-2xl/75 transition-all lg:h-full lg:max-h-none lg:w-80 lg:border-r-2 lg:border-b-0',
                !isOpen && '-translate-y-full lg:-translate-x-full lg:translate-y-0',
            )}
        >
            <div class="flex max-h-full flex-col overflow-y-auto p-3">
                {scheduleIds.length > 0 ? (
                    <>
                        <AppOptionsMenuSchedulePeriodPicklist />
                        <AppOptionsMenuHorizontalLine />
                        <AppOptionsMenuSavedSchedulesSection />
                        <AppOptionsMenuHorizontalLine />
                        <AppOptionsMenuSelectedSchedulesSection />
                        <AppOptionsMenuHorizontalLine />
                        <AppOptionsMenuHiddenSubjectsAndTypesSection />
                        <AppOptionsMenuHorizontalLine />
                        <AppOptionsMenuShowLanguageSlotsCheckbox />
                        <AppOptionsMenuShowLongBreaksCheckbox />
                    </>
                ) : (
                    <>
                        <AppOptionsMenuSavedSchedulesSection />
                        <AppOptionsMenuHorizontalLine />
                        <AppOptionsMenuInitialSelectButton />
                    </>
                )}

                <a
                    class="mx-auto mt-auto pt-2 text-center font-mono text-gray-400 hover:underline"
                    href="https://github.com/szczursonn/uek-planzajec-v3"
                    target="_blank"
                >
                    {appVersion ?? 'unknown'}
                </a>
            </div>
        </aside>
    );
};
