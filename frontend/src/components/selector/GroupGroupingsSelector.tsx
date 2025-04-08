import { useMemo } from 'preact/hooks';
import { createStringQueryParamState, updateQueryParams, useURLCreator } from '../../lib/state/queryParamsState';
import { useGroupingsAPI } from '../../lib/api/groupings';
import { selectorGroupingState } from '../modals/ScheduleSelectorModal';
import { SearchInput } from '../common/SearchInput';
import { SelectorNestableLinkList } from './SelectorNestableLinkList';
import { SelectorErrorAlert } from './SelectorErrorAlert';
import { SelectorLinkListSkeleton } from './SelectorLinkList';

export const groupGroupingsSelectorSearchState = createStringQueryParamState('select_gg_search');

export const GroupGroupingsSelector = () => {
    const query = useGroupingsAPI();

    const searchValueLowerCase = groupGroupingsSelectorSearchState.use().toLowerCase();
    const createURL = useURLCreator();

    const firstLetterGroups = useMemo(
        () =>
            Object.entries(
                query.data?.groups.reduce(
                    (firstLetterToGroupings, grouping) => {
                        if (!searchValueLowerCase || grouping.toLowerCase().includes(searchValueLowerCase)) {
                            const firstLetterUpperCase = grouping[0]?.toUpperCase() ?? '';
                            firstLetterToGroupings[firstLetterUpperCase] =
                                firstLetterToGroupings[firstLetterUpperCase] ?? [];
                            firstLetterToGroupings[firstLetterUpperCase]!.push(grouping);
                        }

                        return firstLetterToGroupings;
                    },
                    {} as Record<string, string[]>,
                ) ?? [],
            )
                .map(([firstLetterUppercase, groups]) => ({
                    label: firstLetterUppercase,
                    items: groups
                        .sort((a, b) => a.localeCompare(b))
                        .map((group) => ({
                            label: group,
                            href: createURL(
                                groupGroupingsSelectorSearchState.createUpdate(''),
                                selectorGroupingState.createUpdate(group),
                            ),
                        })),
                }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        [query.data?.groups, searchValueLowerCase, createURL],
    );

    return (
        <>
            <SearchInput
                value={searchValueLowerCase}
                focusOnRender
                onChange={(newValue) =>
                    updateQueryParams('replaceState', groupGroupingsSelectorSearchState.createUpdate(newValue))
                }
            />
            {query.isLoading ? (
                <SelectorLinkListSkeleton />
            ) : !query.data && query.error ? (
                <SelectorErrorAlert error={query.error} />
            ) : (
                <SelectorNestableLinkList groups={firstLetterGroups} />
            )}
        </>
    );
};
