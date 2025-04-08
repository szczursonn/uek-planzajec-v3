import clsx from 'clsx';
import { labels } from '../../lib/labels';
import {
    hiddenSubjectsAndTypesState,
    scheduleIdsState,
    scheduleTypeState,
    useAppScheduleQuery,
} from '../../lib/useAppScheduleQuery';
import { matchSavedSchedule, savedSchedulesState } from '../../lib/useSavedSchedules';
import { Icon } from '../common/Icon';
import uekLogoNoText from '../../assets/uekLogoNoText.svg';

export const AppHeader = ({
    isAppOptionsMenuOpen,
    onAppOptionsMenuButtonClick,
}: {
    isAppOptionsMenuOpen: boolean;
    onAppOptionsMenuButtonClick: () => void;
}) => {
    const query = useAppScheduleQuery();
    const scheduleIds = scheduleIdsState.use();
    const scheduleType = scheduleTypeState.use();
    const hiddenSubjectsAndTypes = hiddenSubjectsAndTypesState.use();
    const savedSchedules = savedSchedulesState.use();

    const currentSavedScheduleName = savedSchedules.find((savedSchedule) =>
        matchSavedSchedule(savedSchedule, {
            scheduleIds,
            scheduleType,
            hiddenSubjectsAndTypes,
        }),
    )?.name;

    const headerText =
        currentSavedScheduleName ||
        (query.isLoading
            ? labels.loading
            : query.data?.headers.map((header) => header.name).join(', ') || scheduleIds.join(', '));

    document.title = [headerText, labels.appTitle].filter(Boolean).join(' | ');

    return (
        <header class="border-b-back-tertiary bg-back-secondary fixed top-0 z-30 flex h-16 w-full items-center justify-center border-b-2 px-4 font-semibold shadow-2xl/50">
            <div class="absolute left-4 flex h-full items-center gap-4 lg:left-20">
                <img class="h-full py-2.5 lg:py-2" src={uekLogoNoText} alt={labels.appTitle} />
                <span class="hidden lg:block">{labels.appTitle}</span>
            </div>

            <span class="mx-14 overflow-x-hidden text-center text-sm text-ellipsis whitespace-nowrap lg:mx-64 lg:text-lg">
                {headerText || '-'}
            </span>

            <button
                class="hover:bg-back-tertiary active:bg-back-quaternary absolute right-4 h-12 w-12 cursor-pointer rounded-full border-2 border-transparent py-2.5 transition-all md:border-4 lg:left-4"
                type="button"
                onClick={onAppOptionsMenuButtonClick}
            >
                <Icon name={isAppOptionsMenuOpen ? 'cross' : 'burgerMenu'} class="h-full w-full p-0.5 lg:hidden" />
                <Icon
                    name="burgerMenu"
                    class={clsx(
                        'hidden h-full w-full transition-transform lg:block',
                        isAppOptionsMenuOpen && 'rotate-180',
                    )}
                />
            </button>
        </header>
    );
};
