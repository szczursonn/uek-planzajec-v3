import clsx from 'clsx';
import { useAppScheduleQuery } from '../../lib/useAppScheduleQuery';
import { ScheduleQueryErrorAlert } from './ScheduleQueryErrorAlert';
import { ScheduleViewWeek, ScheduleViewWeekSkeleton } from './ScheduleViewWeek';

export const AppMainView = ({ isAppOptionsMenuOpen }: { isAppOptionsMenuOpen: boolean }) => {
    const query = useAppScheduleQuery();

    return (
        <main class={clsx('bg-back-primary mt-16 min-h-full transition-all', isAppOptionsMenuOpen && 'lg:ml-80')}>
            {query.isLoading ? (
                <ScheduleViewWeekSkeleton />
            ) : query.error ? (
                <ScheduleQueryErrorAlert />
            ) : (
                <ScheduleViewWeek />
            )}
        </main>
    );
};
