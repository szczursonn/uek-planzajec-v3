import { useMemo } from 'preact/hooks';
import clsx from 'clsx';
import { labels } from '../../lib/intl/labels';
import { anchorPushStateHandler, useURLCreator } from '../../lib/state/queryParamsState';
import { hiddenSubjectsState, useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { subjectDetailsModalSubjectState } from '../modals/SubjectDetailsModal';
import { AppOptionsDrawerSection } from './AppOptionsDrawerSection';
import { RoundIconButton } from '../common/RoundIconButton';

export const AppOptionsDrawerSubjectsSection = () => {
    const query = useAppScheduleQuery();
    const currentHiddenSubjects = hiddenSubjectsState.use();

    const subjectsEntries = useMemo(() => {
        const subjectToLecturerNameToItemCount = {} as Record<string, Record<string, number>>;
        for (const item of query.data?.items ?? []) {
            subjectToLecturerNameToItemCount[item.subject] = subjectToLecturerNameToItemCount[item.subject] ?? {};
            for (const lecturer of item.lecturers) {
                subjectToLecturerNameToItemCount[item.subject]![lecturer.name] =
                    (subjectToLecturerNameToItemCount[item.subject]![lecturer.name] ?? 0) + 1;
            }
        }

        return Object.entries(subjectToLecturerNameToItemCount)
            .map(([subject, lecturerNameToItemCount]) => ({
                subject,
                lecturersDisplayList: Object.entries(lecturerNameToItemCount)
                    .sort(
                        ([lecturerNameA, countA], [lecturerNameB, countB]) =>
                            countB - countA || lecturerNameA.localeCompare(lecturerNameB),
                    )
                    .map(([lecturerName]) => lecturerName)
                    .join(', '),
                isHidden: currentHiddenSubjects.includes(subject),
            }))
            .sort((a, b) => a.subject.localeCompare(b.subject));
    }, [query.data?.items, currentHiddenSubjects]);

    const createDerivedURL = useURLCreator();

    if (query.isLoading || subjectsEntries.length === 0) {
        return null;
    }

    return (
        <AppOptionsDrawerSection title={labels.subjects}>
            <div class="divide-x-bg-quaternary divide-y-2">
                {subjectsEntries.map(({ subject, lecturersDisplayList, isHidden }) => (
                    <div
                        class={clsx(
                            'flex items-center justify-between py-1.5 transition-opacity',
                            isHidden && 'opacity-50 hover:opacity-100',
                        )}
                    >
                        <div class="overflow-hidden">
                            <div class="truncate" title={subject || labels.unnamedPlaceholder}>
                                {subject || labels.unnamedPlaceholder}
                            </div>
                            <div class="text-x-text-default-muted truncate text-xs" title={lecturersDisplayList}>
                                {lecturersDisplayList}
                            </div>
                        </div>

                        <div class="text-x-text-default-muted flex gap-0.5">
                            <RoundIconButton
                                class="h-8 p-1.25"
                                icon={isHidden ? 'eyeHide' : 'eyeShow'}
                                title={(isHidden ? labels.showXCTA : labels.hideXCTA)(
                                    subject || labels.unnamedPlaceholder,
                                )}
                                href={createDerivedURL(
                                    (isHidden
                                        ? hiddenSubjectsState.createRemoveUpdater
                                        : hiddenSubjectsState.createAddUpdater)(subject),
                                )}
                                onClick={anchorPushStateHandler}
                            />
                            {subject && (
                                <RoundIconButton
                                    class="h-8 p-1.25"
                                    icon="info"
                                    href={createDerivedURL(subjectDetailsModalSubjectState.createUpdate(subject))}
                                    onClick={anchorPushStateHandler}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </AppOptionsDrawerSection>
    );
};
