import { useEffect } from 'preact/hooks';
import clsx from 'clsx';
import uekLogoNoText from '../../assets/uekLogoNoText.svg';
import { hiddenSubjectsState, scheduleIdsState, useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { labels } from '../../lib/intl/labels';
import { anchorPushStateHandler } from '../../lib/state/queryParamsState';
import { RoundIconButton } from '../common/RoundIconButton';
import { AppOptionsDrawer } from './AppOptionsDrawer';
import { AppOptionsShareButton } from './AppOptionsShareButton';
import { AppOptionsExportButton } from './AppOptionsExportButton';
import { SchedulePeriodSelect } from '../other/SchedulePeriodSelect';

export const AppHeader = ({
    isOptionsDrawerOpen,
    onToggleOptionsDrawer,
}: {
    isOptionsDrawerOpen: boolean;
    onToggleOptionsDrawer: () => void;
}) => {
    const query = useAppScheduleQuery();

    const currentScheduleIds = scheduleIdsState.use();
    const currentHiddenSubjects = hiddenSubjectsState.use();

    useEffect(() => {
        document.title = [query.data?.schedule.headers.map((header) => header.name).join(', '), labels.appTitle]
            .filter(Boolean)
            .join(' | ');
    }, [query.data?.schedule.headers]);

    return (
        <div class="shadow-x-bg-primary sticky top-0 z-50 shadow-lg">
            <header class="bg-x-bg-secondary border-b-x-bg-tertiary flex h-16 w-full items-center justify-between border-b-2 px-3 py-2 transition-colors lg:px-4">
                <div class="flex h-full w-full items-center gap-2 lg:w-auto lg:gap-4">
                    <div class="hidden lg:contents">
                        <RoundIconButton
                            class={clsx('h-10 p-1.5', isOptionsDrawerOpen && 'rotate-180')}
                            icon="burgerMenu"
                            onClick={onToggleOptionsDrawer}
                        />
                    </div>

                    <a
                        class="outline-x-cta-primary flex h-full shrink-0 items-center gap-3 transition-opacity hover:underline hover:opacity-80 focus-visible:outline-2"
                        href="/"
                        title={labels.appTitle}
                        onClick={anchorPushStateHandler}
                    >
                        <img class="h-full" src={uekLogoNoText} alt={labels.appTitle} />
                        <span class={currentScheduleIds.length > 0 ? 'hidden md:block' : ''}>{labels.appTitle}</span>
                    </a>
                    {currentScheduleIds.length > 0 && <div class="border-x-bg-quaternary h-4/5 w-0 border-1" />}

                    <div class="flex min-w-0 flex-col justify-center">
                        {query.isLoading ? (
                            <div class="bg-x-bg-quaternary h-5 w-64 animate-pulse rounded-2xl" />
                        ) : query.data ? (
                            <>
                                <span class="truncate text-sm sm:text-base">
                                    {query.data.schedule.headers.map((header) => header.name).join(', ')}
                                </span>
                                {currentHiddenSubjects.length > 0 && (
                                    <span class="truncate text-xs lg:text-sm">
                                        {labels.nHiddenSubjects(currentHiddenSubjects.length)}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span class="text-x-text-error truncate">{currentScheduleIds.join(', ')}</span>
                        )}
                    </div>

                    <div class="contents lg:hidden">
                        <RoundIconButton
                            class={clsx('ml-auto h-10 p-1.5', isOptionsDrawerOpen && 'rotate-180')}
                            icon={isOptionsDrawerOpen ? 'cross' : 'burgerMenu'}
                            onClick={onToggleOptionsDrawer}
                        />
                    </div>
                    <div class="hidden xl:block">
                        <AppOptionsShareButton />
                    </div>
                </div>

                <div class="hidden h-full gap-4 lg:flex">
                    <SchedulePeriodSelect
                        class="border-b-x-bg-quinary hover:border-b-x-cta-primary hover:bg-x-bg-tertiary outline-x-cta-primary cursor-pointer border-b-2 px-2 py-3 transition-colors hover:rounded-t focus-visible:rounded-t focus-visible:outline-2"
                        optgroupClass="bg-x-bg-tertiary"
                    />
                    <div class="hidden xl:contents">
                        <AppOptionsExportButton />
                    </div>
                </div>
            </header>
            <AppOptionsDrawer isOpen={isOptionsDrawerOpen} />
        </div>
    );
};
