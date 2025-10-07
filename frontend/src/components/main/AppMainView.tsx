import clsx from 'clsx';
import { scheduleIdsState, useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { updateQueryParams } from '../../lib/state/queryParamsState';
import { labels } from '../../lib/intl/labels';
import { selectorModalOpenState } from '../modals/ScheduleSelectorModal';
import { SchedulePeriodSelect } from '../other/SchedulePeriodSelect';
import { Button } from '../common/Button';
import { AppMainViewQueryError } from './AppMainViewQueryError';
import { ScheduleViewCalendar } from './ScheduleViewCalendar';

export const AppMainView = ({ isOptionsDrawerOpen }: { isOptionsDrawerOpen: boolean }) => {
    const query = useAppScheduleQuery();
    const currentScheduleIds = scheduleIdsState.use();

    return (
        <div class={clsx('mt-2 flex flex-col transition-all', isOptionsDrawerOpen && 'lg:ml-80')}>
            {currentScheduleIds.length === 0 ? (
                <Button
                    class="mx-auto my-8 max-w-72"
                    text={labels.selectScheduleGenericCTA}
                    variant="cta"
                    onClick={() => updateQueryParams('pushState', selectorModalOpenState.createUpdate(true))}
                />
            ) : (
                <>
                    <SchedulePeriodSelect
                        class="border-x-bg-quinary bg-x-bg-secondary hover:border-x-cta-primary hover:bg-x-bg-tertiary outline-x-cta-primary mx-2 cursor-pointer rounded border-1 px-2 py-3 text-sm transition-colors focus-visible:outline-2 sm:hidden lg:max-w-full lg:text-base"
                        optgroupClass="bg-x-bg-tertiary"
                    />
                    {query.error ? <AppMainViewQueryError /> : <ScheduleViewCalendar />}
                </>
            )}
        </div>
    );
};
