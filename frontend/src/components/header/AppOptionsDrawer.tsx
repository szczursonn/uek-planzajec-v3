import clsx from 'clsx';
import { appVersion } from '../../lib/versionInfo';
import { AppOptionsDrawerSchedulePeriodSelector } from './AppOptionsDrawerSchedulePeriodSelector';
import { AppOptionsDrawerSavedSchedulesSection } from './AppOptionsDrawerSavedSchedulesSection';
import { AppOptionsDrawerSelectedSchedulesSection } from './AppOptionsDrawerSelectedSchedulesSection';
import { AppOptionsDrawerSubjectsSection } from './AppOptionsDrawerSubjectsSection';
import { AppOptionsDrawerOtherSettingsSection } from './AppOptionsDrawerOtherSettingsSection';

export const AppOptionsDrawer = ({ isOpen }: { isOpen: boolean }) => {
    return (
        <aside
            class={clsx(
                'bg-x-bg-secondary border-b-x-bg-tertiary border-r-x-bg-tertiary top-0 left-0 h-128 max-h-[60vh] w-full border-b-2 transition-all lg:fixed lg:mt-16 lg:block lg:h-[calc(100%-4rem)] lg:max-h-none lg:w-80 lg:border-r-2 lg:border-b-0',
                isOpen ? 'block' : 'hidden lg:-translate-x-full',
            )}
        >
            <div class="flex max-h-full flex-col items-center gap-2 overflow-y-auto p-3 lg:h-auto lg:min-h-full">
                <AppOptionsDrawerSchedulePeriodSelector />
                <AppOptionsDrawerSavedSchedulesSection />
                <AppOptionsDrawerSelectedSchedulesSection />
                <AppOptionsDrawerSubjectsSection />
                <AppOptionsDrawerOtherSettingsSection />

                <a
                    class="mt-auto shrink-0 text-center font-mono text-gray-500 hover:underline"
                    href="https://github.com/szczursonn/uek-planzajec-v3"
                    target="_blank"
                >
                    {appVersion}
                </a>
            </div>
        </aside>
    );
};
