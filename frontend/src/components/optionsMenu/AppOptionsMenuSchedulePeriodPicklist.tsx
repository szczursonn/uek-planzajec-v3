import { labels } from '../../lib/labels';
import { updateQueryParams } from '../../lib/queryParamState';
import { SCHEDULE_PERIODS, schedulePeriodSchema, schedulePeriodState } from '../../lib/useAppScheduleQuery';

export const AppOptionsMenuSchedulePeriodPicklist = () => (
    <select
        class="bg-back-tertiary hover:bg-back-quaternary focus-visible:outline-cta-primary-darker rounded-md px-2 py-3 transition-colors focus-visible:outline-2"
        value={schedulePeriodState.use()}
        onChange={(event) =>
            updateQueryParams(
                'pushState',
                schedulePeriodState.createUpdate(schedulePeriodSchema.parse(event.currentTarget.value)),
            )
        }
    >
        {SCHEDULE_PERIODS.map((schedulePeriod) => (
            <option key={schedulePeriod} value={schedulePeriod} label={labels.bySchedulePeriod[schedulePeriod]} />
        ))}
    </select>
);
