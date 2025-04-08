import { render } from 'preact';
import './index.css';
import { App } from './components/App';
import { savedSchedulesState, createSavedScheduleSelectionUpdaters } from './lib/savedSchedules';
import { createBooleanQueryParamState, updateQueryParams, type QueryParamsUpdate } from './lib/state/queryParamsState';

const pwaLaunchState = createBooleanQueryParamState('pwa', false);
if (pwaLaunchState.get()) {
    const updates = [pwaLaunchState.createUpdate(false)] as QueryParamsUpdate[];

    const firstSavedSchedule = savedSchedulesState.get()[0];
    if (firstSavedSchedule) {
        updates.push(...createSavedScheduleSelectionUpdaters(firstSavedSchedule));
    }

    updateQueryParams('replaceState', ...updates);
}

render(<App />, document.getElementById('uekpz3-root')!);
