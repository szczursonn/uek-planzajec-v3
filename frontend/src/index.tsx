import { render } from 'preact';
import './index.css';
import { createBooleanQueryParamState, updateQueryParams } from './lib/queryParamState';
import { createSavedScheduleSelectionUpdates, savedSchedulesState } from './lib/useSavedSchedules';
import { AppScheduleQueryProvider, scheduleIdsState } from './lib/useAppScheduleQuery';
import { isSelectModalOpenState, SimpleSelectModalHost } from './components/modals/SimpleSelectModal';
import { ExportModalHost } from './components/modals/ExportModal';
import { ItemDetailsModalHost } from './components/modals/ItemDetailsModal';
import { SaveScheduleModalHost } from './components/modals/SaveScheduleModal';
import { SubjectDetailsModalHost } from './components/modals/SubjectDetailsModal';
import { AppMainLayer } from './components/main/AppMainLayer';

{
    // PWA: launch into first saved schedule
    const pwaLaunchState = createBooleanQueryParamState('pwa', false);
    if (pwaLaunchState.get()) {
        const pwaLaunchUpdates = [pwaLaunchState.createUpdate(false)];

        const savedSchedules = savedSchedulesState.get();
        if (savedSchedules.length > 0) {
            pwaLaunchUpdates.push(...createSavedScheduleSelectionUpdates(savedSchedules[0]!));
        }
        updateQueryParams('replaceState', ...pwaLaunchUpdates);
    }

    // no schedules selected: launch into selection modal
    if (scheduleIdsState.get().length === 0) {
        updateQueryParams('replaceState', isSelectModalOpenState.createUpdate(true));
    }
}

render(
    <AppScheduleQueryProvider>
        <AppMainLayer />
        <ExportModalHost />
        <ItemDetailsModalHost />
        <SaveScheduleModalHost />
        <SimpleSelectModalHost />
        <SubjectDetailsModalHost />
    </AppScheduleQueryProvider>,
    document.getElementById('uekpz3-root')!,
);
