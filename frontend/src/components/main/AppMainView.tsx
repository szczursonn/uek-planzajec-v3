import clsx from 'clsx';
import { useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { AppMainViewQueryError } from './AppMainViewQueryError';
import { ScheduleViewCalendar } from './ScheduleViewCalendar';

export const AppMainView = ({ isOptionsDrawerOpen }: { isOptionsDrawerOpen: boolean }) => {
    const query = useAppScheduleQuery();

    return (
        <div class={clsx('flex flex-col transition-all', isOptionsDrawerOpen && 'lg:ml-80')}>
            {query.error ? <AppMainViewQueryError /> : <ScheduleViewCalendar />}
        </div>
    );
};
