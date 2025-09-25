import { labels } from '../../lib/intl/labels';
import { AppOptionsDrawerSection } from './AppOptionsDrawerSection';
import { SchedulePeriodSelect } from '../other/SchedulePeriodSelect';

export const AppOptionsDrawerSchedulePeriodSelector = () => {
    return (
        <div class="contents lg:hidden">
            <AppOptionsDrawerSection title={labels.timePeriod}>
                <SchedulePeriodSelect class="bg-x-bg-secondary hover:bg-x-bg-tertiary border-x-bg-quaternary outline-x-cta-primary w-full cursor-pointer rounded-md border-2 p-2 transition-colors focus-visible:outline-2" />
            </AppOptionsDrawerSection>
        </div>
    );
};
