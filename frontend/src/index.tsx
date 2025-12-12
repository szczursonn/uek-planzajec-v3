import { render } from 'preact';
import './index.css';
import { App } from './components/App';
import { selectorModalOpenState } from './components/modals/ScheduleSelectorModal';
import { savedSchedulesState, createSavedScheduleSelectionUpdaters } from './lib/savedSchedules';
import { createBooleanQueryParamState, updateQueryParams, type QueryParamsUpdate } from './lib/state/queryParamsState';
import { scheduleIdsState } from './lib/appScheduleQuery';

const pwaLaunchState = createBooleanQueryParamState('pwa', false);
if (pwaLaunchState.get()) {
    const updates = [pwaLaunchState.createUpdate(false)] as QueryParamsUpdate[];

    const firstSavedSchedule = savedSchedulesState.get()[0];
    if (firstSavedSchedule) {
        updates.push(...createSavedScheduleSelectionUpdaters(firstSavedSchedule));
    }

    updateQueryParams('replaceState', ...updates);
}

if (scheduleIdsState.get().length === 0 && !selectorModalOpenState.get()) {
    updateQueryParams('pushState', selectorModalOpenState.createUpdate(true));
}

render(<App />, document.getElementById('uekpz3-root')!);
