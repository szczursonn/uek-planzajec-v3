import clsx from 'clsx';
import { scheduleIdsState, useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { updateQueryParams } from '../../lib/state/queryParamsState';
import { labels } from '../../lib/intl/labels';
import { selectorModalOpenState } from '../modals/ScheduleSelectorModal';
import { Button } from '../common/Button';
import { AppMainViewQueryError } from './AppMainViewQueryError';
import { ScheduleViewCalendar } from './ScheduleViewCalendar';

export const AppMainView = ({ isOptionsDrawerOpen }: { isOptionsDrawerOpen: boolean }) => {
    const query = useAppScheduleQuery();
    const currentScheduleIds = scheduleIdsState.use();

    return (
        <div class={clsx('flex flex-col transition-all', isOptionsDrawerOpen && 'lg:ml-80')}>
            {currentScheduleIds.length === 0 ? (
                <Button
                    class="mx-auto my-8 max-w-72"
                    text={labels.selectScheduleGenericCTA}
                    variant="cta"
                    onClick={() => updateQueryParams('pushState', selectorModalOpenState.createUpdate(true))}
                />
            ) : query.error ? (
                <AppMainViewQueryError />
            ) : (
                <ScheduleViewCalendar />
            )}
        </div>
    );
};
