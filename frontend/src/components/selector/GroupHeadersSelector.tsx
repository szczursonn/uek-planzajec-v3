import { useMemo } from 'preact/hooks';
import { type GroupMode, type GroupStage, type ScheduleHeader, useHeadersAPI } from '../../lib/api/headers';
import { selectorModalOpenState, selectorGroupingState } from '../modals/ScheduleSelectorModal';
import { labels } from '../../lib/intl/labels';
import {
    createIntQueryParamState,
    createStringQueryParamState,
    updateQueryParams,
    useURLCreator,
} from '../../lib/state/queryParamsState';
import { scheduleIdsState } from '../../lib/appScheduleQuery';
import { SearchInput } from '../common/SearchInput';
import { Icon, type IconName } from '../common/Icon';
import { SelectorTileLinkList, SelectorTileLink, SelectorTileLinkListSkeleton } from './SelectorTileLinkList';
import { type SelectorLinkListItem } from './SelectorLinkList';
import { SelectorNestableLinkList } from './SelectorNestableLinkList';
import { SelectorErrorAlert } from './SelectorErrorAlert';

const GROUP_MODE_ORDER = {
    'full-time': 1,
    'part-time': 2,
};

const GROUP_STAGE_ORDER = {
    bachelor: 1,
    master: 2,
    uniform: 3,
};

const LANGUAGE_TO_FLAG_IMG = {
    ANG: 'https://www.countryflags.com/wp-content/uploads/united-kingdom-flag-png-large.png',
    CHI: 'https://www.countryflags.com/wp-content/uploads/china-flag-png-large.png',
    ENG: 'https://www.countryflags.com/wp-content/uploads/united-kingdom-flag-png-large.png',
    FRA: 'https://www.countryflags.com/wp-content/uploads/france-flag-png-large.png',
    GER: 'https://www.countryflags.com/wp-content/uploads/germany-flag-png-large.png',
    HIS: 'https://www.countryflags.com/wp-content/uploads/spain-flag-png-large.png',
    NIE: 'https://www.countryflags.com/wp-content/uploads/germany-flag-png-large.png',
    POL: 'https://www.countryflags.com/wp-content/uploads/poland-flag-png-large.png',
    ROS: 'https://www.countryflags.com/wp-content/uploads/russia-flag-png-large.png',
    SPA: 'https://www.countryflags.com/wp-content/uploads/spain-flag-png-large.png',
    WLO: 'https://www.countryflags.com/wp-content/uploads/italy-flag-png-large.png',
} as Record<string, string>;

const GROUP_STAGE_TO_ICON = {
    bachelor: 'roman1',
    master: 'roman2',
} as Record<string, IconName>;

export const groupHeadersSelectorSearchState = createStringQueryParamState('select_gh_search');
export const groupHeadersSelectorGroupModeState = createStringQueryParamState('select_gh_mode');
export const groupHeadersSelectorGroupStageState = createStringQueryParamState('select_gh_stage');
export const groupHeadersSelectorGroupSemesterState = createIntQueryParamState('select_gh_semester');
export const groupHeadersSelectorGroupLanguageState = createStringQueryParamState('select_gh_language');
export const groupHeadersSelectorGroupLanguageLevelState = createStringQueryParamState('select_gh_language_level');

export const GroupHeadersSelector = () => {
    const currentGrouping = selectorGroupingState.use();
    const query = useHeadersAPI('group', currentGrouping);

    const filtersOptions = useMemo(() => {
        const uniqueModes = new Set<GroupMode>();
        const uniqueStages = new Set<GroupStage>();
        let highestSemester = null;
        const uniqueLanguages = new Set<string>();
        const uniqueLanguageLevels = new Set<string>();

        for (const header of query.data ?? []) {
            if (header.details) {
                uniqueModes.add(header.details.mode);
                uniqueStages.add(header.details.stage);
                highestSemester = Math.max(highestSemester ?? -Infinity, header.details.semester);
                if (header.details.language) {
                    uniqueLanguages.add(header.details.language);
                }
                if (header.details.languageLevel) {
                    uniqueLanguageLevels.add(header.details.languageLevel);
                }
            }
        }

        return {
            modes: Array.from(uniqueModes).sort((a, b) => (GROUP_MODE_ORDER[a] > GROUP_MODE_ORDER[b] ? 1 : -1)),
            stages: Array.from(uniqueStages).sort((a, b) => (GROUP_STAGE_ORDER[a] > GROUP_STAGE_ORDER[b] ? 1 : -1)),
            semesters:
                highestSemester === null
                    ? []
                    : Array.from(Array(highestSemester).keys())
                          .map((i) => i + 1)
                          .map((n) => ({
                              label: `${labels.nYear(Math.floor((n + 1) / 2))}, ${labels.nSemester(n)}`,
                              value: n,
                          })),
            languages: Array.from(uniqueLanguages).sort(),
            languageLevels: Array.from(uniqueLanguageLevels).sort(),
        } as const;
    }, [query.data]);

    const searchValueLowerCase = groupHeadersSelectorSearchState.use().toLowerCase();
    const selectedMode = groupHeadersSelectorGroupModeState.use();
    const selectedStage = groupHeadersSelectorGroupStageState.use();
    const selectedSemester = groupHeadersSelectorGroupSemesterState.use();
    const selectedLanguage = groupHeadersSelectorGroupLanguageState.use();
    const selectedLanguageLevel = groupHeadersSelectorGroupLanguageLevelState.use();

    const createURL = useURLCreator();

    const linkListGroups = useMemo(() => {
        const createLink = (header: ScheduleHeader) => ({
            label: header.name,
            href: createURL(
                selectorModalOpenState.createUpdate(false),
                selectorGroupingState.createUpdate(''),
                groupHeadersSelectorSearchState.createUpdate(''),
                groupHeadersSelectorGroupModeState.createUpdate(''),
                groupHeadersSelectorGroupStageState.createUpdate(''),
                groupHeadersSelectorGroupSemesterState.createUpdate(null),
                groupHeadersSelectorGroupLanguageState.createUpdate(''),
                groupHeadersSelectorGroupLanguageLevelState.createUpdate(''),
                scheduleIdsState.createAddUpdate(header.id),
            ),
        });

        const unfilterableByDetailsLinks: SelectorLinkListItem[] = [];
        const filteredByDetailsLinks: SelectorLinkListItem[] = [];

        for (const header of query.data ?? []) {
            if (searchValueLowerCase && !header.name.toLowerCase().includes(searchValueLowerCase)) {
                continue;
            }

            if (!header.details) {
                unfilterableByDetailsLinks.push(createLink(header));
                continue;
            }

            if (
                (!selectedMode || header.details.mode === selectedMode) &&
                (!selectedStage || header.details.stage === selectedStage) &&
                (selectedSemester === null || header.details.semester === selectedSemester) &&
                (!selectedLanguage || header.details.language === selectedLanguage) &&
                (!selectedLanguageLevel || header.details.languageLevel === selectedLanguageLevel)
            ) {
                filteredByDetailsLinks.push(createLink(header));
            }
        }

        if (
            !selectedMode &&
            !selectedStage &&
            selectedSemester === null &&
            !selectedLanguage &&
            !selectedLanguageLevel
        ) {
            return [
                {
                    label: currentGrouping,
                    items: unfilterableByDetailsLinks,
                },
            ];
        }

        const linkGroups = [
            {
                label:
                    [
                        selectedMode in labels.groupModes
                            ? labels.groupModes[selectedMode as keyof typeof labels.groupModes]
                            : null,
                        selectedStage in labels.groupStages
                            ? labels.groupStages[selectedStage as keyof typeof labels.groupStages]
                            : null,
                        selectedSemester !== null && labels.nSemester(selectedSemester),
                        [selectedLanguage, selectedLanguageLevel].filter(Boolean).join(' '),
                    ]
                        .filter(Boolean)
                        .join(', ') || currentGrouping,
                items: filteredByDetailsLinks,
            },
        ];

        if (unfilterableByDetailsLinks.length > 0) {
            linkGroups.push({
                label: labels.otherLinks,
                items: unfilterableByDetailsLinks,
            });
        }

        return linkGroups;
    }, [
        query.data,
        currentGrouping,
        selectedMode,
        selectedStage,
        selectedSemester,
        selectedLanguage,
        selectedLanguageLevel,
        createURL,
    ]);

    if (query.isLoading) {
        return <SelectorTileLinkListSkeleton childCount={2} />;
    }

    if (!query.data && query.error) {
        return <SelectorErrorAlert error={query.error} />;
    }

    if (!selectedMode && filtersOptions.modes.length > 1) {
        return (
            <SelectorTileLinkList title={labels.selectGroupModeCTA}>
                {filtersOptions.modes.map((mode) => (
                    <SelectorTileLink
                        key={mode}
                        label={labels.groupModes[mode]}
                        href={createURL(groupHeadersSelectorGroupModeState.createUpdate(mode))}
                    />
                ))}
            </SelectorTileLinkList>
        );
    }

    if (!selectedStage && filtersOptions.stages.length > 1) {
        return (
            <SelectorTileLinkList title={labels.selectGroupStageCTA}>
                {filtersOptions.stages.map((stage) => (
                    <SelectorTileLink
                        key={stage}
                        label={labels.groupStages[stage]}
                        href={createURL(groupHeadersSelectorGroupStageState.createUpdate(stage))}
                    >
                        {GROUP_STAGE_TO_ICON[stage] && <Icon name={GROUP_STAGE_TO_ICON[stage]} class="p-4" />}
                    </SelectorTileLink>
                ))}
            </SelectorTileLinkList>
        );
    }

    if (selectedSemester === null && filtersOptions.semesters.length > 1) {
        return (
            <SelectorTileLinkList title={labels.selectSemesterCTA}>
                {filtersOptions.semesters.map((semesterOption) => (
                    <SelectorTileLink
                        key={semesterOption.value}
                        label={semesterOption.label}
                        href={createURL(groupHeadersSelectorGroupSemesterState.createUpdate(semesterOption.value))}
                    />
                ))}
            </SelectorTileLinkList>
        );
    }

    if (!selectedLanguage && filtersOptions.languages.length > 1) {
        return (
            <SelectorTileLinkList title={labels.selectLanguageCTA}>
                {filtersOptions.languages.map((language) => (
                    <SelectorTileLink
                        key={language}
                        label={language}
                        href={createURL(groupHeadersSelectorGroupLanguageState.createUpdate(language))}
                    >
                        {LANGUAGE_TO_FLAG_IMG[language] && (
                            <img
                                src={LANGUAGE_TO_FLAG_IMG[language]}
                                class="shadow-x-bg-primary max-h-3/5 shadow-2xl"
                            />
                        )}
                    </SelectorTileLink>
                ))}
            </SelectorTileLinkList>
        );
    }

    if (!selectedLanguageLevel && filtersOptions.languageLevels.length > 1) {
        return (
            <SelectorTileLinkList title={labels.selectLanguageLevelCTA}>
                {filtersOptions.languageLevels.map((languageLevel) => (
                    <SelectorTileLink
                        key={languageLevel}
                        label={languageLevel}
                        href={createURL(groupHeadersSelectorGroupLanguageLevelState.createUpdate(languageLevel))}
                    />
                ))}
            </SelectorTileLinkList>
        );
    }

    return (
        <>
            <SearchInput
                value={searchValueLowerCase}
                focusOnRender
                onChange={(newValue) =>
                    updateQueryParams('replaceState', groupHeadersSelectorSearchState.createUpdate(newValue))
                }
            />
            <SelectorNestableLinkList groups={linkListGroups} />
        </>
    );
};
