import { useMemo } from 'preact/hooks';
import { clsx } from 'clsx';
import { createBooleanLocalStorageState } from '../../lib/localStorageState';
import { hiddenSubjectsAndTypesState, useAppScheduleQuery } from '../../lib/useAppScheduleQuery';
import { unicodeAwareStringArraySorter } from '../../lib/utils';
import { AppOptionsMenuCollapsibleSection } from './AppOptionsMenuCollapsibleSection';
import { AppOptionsMenuCheckbox, AppOptionsMenuCheckboxSkeleton } from './AppOptionsMenuCheckbox';
import { SCHEDULE_ITEM_TYPE_TO_CATEGORY } from '../../lib/uek';
import { anchorClickPushStateHandler, updateQueryParams, useCreateURL } from '../../lib/queryParamState';
import { labels } from '../../lib/labels';
import { Button } from '../common/Button';
import { subjectDetailsSubjectState } from '../modals/SubjectDetailsModal';
import { Icon } from '../common/Icon';

const getHiddenItemTypeCheckboxClass = (itemType: string) => {
    const itemCategory = SCHEDULE_ITEM_TYPE_TO_CATEGORY[itemType];

    switch (itemCategory) {
        case 'lecture':
            return 'accent-sky-600';
        case 'exercise':
            return 'accent-amber-600';
        case 'language':
            return 'accent-green-600';
        case 'exam':
            return 'accent-red-600';
        default:
            return 'accent-gray-600';
    }
};

const itemSubjectsAndTypesSectionCollapsedState = createBooleanLocalStorageState(
    'appOptionsMenuSectionSubjectsAndTypes',
    true,
);

export const AppOptionsMenuHiddenSubjectsAndTypesSection = () => {
    const query = useAppScheduleQuery();

    const hiddenSubjectsAndTypes = hiddenSubjectsAndTypesState.use();

    const options = useMemo(() => {
        const subjectToTypes = {} as Record<string, Set<string>>;
        if (query.data) {
            for (const item of query.data.items) {
                if (item.category === 'languageSlot') {
                    continue;
                }

                subjectToTypes[item.subject] = subjectToTypes[item.subject] ?? new Set();
                subjectToTypes[item.subject]!.add(item.type);
            }
        }
        for (const hiddenSubjectAndType of hiddenSubjectsAndTypes) {
            subjectToTypes[hiddenSubjectAndType.subject] = subjectToTypes[hiddenSubjectAndType.subject] ?? new Set();
            subjectToTypes[hiddenSubjectAndType.subject]!.add(hiddenSubjectAndType.type);
        }

        const options = [] as {
            subject: string;
            types: {
                type: string;
                isHidden: boolean;
            }[];
        }[];

        for (const subject of Object.keys(subjectToTypes).sort(unicodeAwareStringArraySorter)) {
            options.push({
                subject,
                types: Array.from(subjectToTypes[subject]!)
                    .sort(unicodeAwareStringArraySorter)
                    .map((type) => ({
                        type,
                        isHidden: !!hiddenSubjectsAndTypes.find(
                            (hiddenSubjectAndType) =>
                                hiddenSubjectAndType.subject === subject && hiddenSubjectAndType.type === type,
                        ),
                    })),
            });
        }

        return options;
    }, [query.data, hiddenSubjectsAndTypes]);

    const createURL = useCreateURL();

    const [isOpen, setIsOpen] = itemSubjectsAndTypesSectionCollapsedState.useAsInitial();
    return (
        <AppOptionsMenuCollapsibleSection
            title={labels.scheduleItemSubjects}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
        >
            {query.isLoading &&
                [...Array(3).keys()].map((i) => (
                    <>
                        <div class="bg-back-quaternary mt-3 mb-1.5 ml-2 h-5 animate-pulse cursor-progress rounded-md" />
                        {[...Array(i + 1).keys()].map(() => (
                            <AppOptionsMenuCheckboxSkeleton class="ml-2" />
                        ))}
                    </>
                ))}
            {options.map(({ subject, types }) => (
                <div key={subject}>
                    <div class="flex items-center justify-between gap-2 rounded-xl px-2 py-1">
                        <span>{subject || labels.scheduleItemEmptySubjectPlaceholder}</span>
                        {subject && (
                            <a
                                title={labels.details}
                                href={createURL(subjectDetailsSubjectState.createUpdate(subject))}
                                target="_blank"
                                onClick={anchorClickPushStateHandler}
                                class="fill-white transition-colors not-hover:fill-zinc-400"
                            >
                                <Icon name="info" class="h-4 w-4 fill-inherit" />
                            </a>
                        )}
                    </div>
                    {types.map(({ type, isHidden }) => (
                        <AppOptionsMenuCheckbox
                            key={subject + type}
                            class={clsx('ml-2', getHiddenItemTypeCheckboxClass(type))}
                            label={type}
                            title={isHidden ? labels.showX(type) : labels.hideX(type)}
                            checked={!isHidden}
                            onChecked={(newChecked) =>
                                updateQueryParams(
                                    'replaceState',
                                    hiddenSubjectsAndTypesState.createUpdate(
                                        newChecked
                                            ? hiddenSubjectsAndTypes.filter(
                                                  (hiddenSubjectAndType) =>
                                                      !(
                                                          hiddenSubjectAndType.subject === subject &&
                                                          hiddenSubjectAndType.type === type
                                                      ),
                                              )
                                            : [...hiddenSubjectsAndTypes, { subject, type }],
                                    ),
                                )
                            }
                        />
                    ))}
                </div>
            ))}
        </AppOptionsMenuCollapsibleSection>
    );
};
