import { SCHEDULE_PERIODS, schedulePeriodSchema, schedulePeriodState } from '../../lib/appScheduleQuery';
import { updateQueryParams } from '../../lib/state/queryParamsState';
import { labels } from '../../lib/intl/labels';
import { AppOptionsDrawerSection } from './AppOptionsDrawerSection';

export const AppOptionsDrawerSchedulePeriodSelector = () => {
    const currentSchedulePeriod = schedulePeriodState.use();

    return (
        <div class="contents lg:hidden">
            <AppOptionsDrawerSection title={labels.timePeriod}>
                <select
                    class="bg-x-bg-secondary hover:bg-x-bg-tertiary border-x-bg-quaternary outline-x-cta-primary w-full cursor-pointer rounded-md border-2 p-2 transition-colors focus-visible:outline-2"
                    value={currentSchedulePeriod}
                    onChange={(event) =>
                        updateQueryParams(
                            'pushState',
                            schedulePeriodState.createUpdate(schedulePeriodSchema.parse(event.currentTarget.value)),
                        )
                    }
                >
                    {SCHEDULE_PERIODS.map((schedulePeriod) => (
                        <option
                            key={schedulePeriod}
                            value={schedulePeriod}
                            label={labels.schedulePeriodNames[schedulePeriod]}
                        />
                    ))}
                </select>
            </AppOptionsDrawerSection>
        </div>
    );
};
