import { createBooleanLocalStorageState } from './state/localStorageState';

export const showLongBreaksState = createBooleanLocalStorageState('showLongBreaks', true);
export const highlightOnlineOnlyDaysState = createBooleanLocalStorageState('showOnlineOnlyDays', true);

export const LONG_BREAK_THRESHOLD = 1000 * 60 * 60; // 1h
