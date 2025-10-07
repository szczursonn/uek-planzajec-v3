import { TIME_ZONE } from '../date/timeZone';

export const addScheduleCTA = 'Dodaj plan zajęć';
export const appTitle = 'Plan zajęć UEK';
export const appDescription = 'Nieoficjalny plan zajęć Uniwersytetu Ekonomicznego w Krakowie';
export const details = 'Szczegóły';
export const durationHoursAndMinutesShort = (ms: number) => {
    let minutes = Math.round(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    minutes -= hours * 60;

    const parts = [];

    if (hours > 0) {
        parts.push(`${hours}g.`);
    }

    if (minutes > 0 || hours === 0) {
        parts.push(`${minutes}m.`);
    }

    return parts.join(' ');
};
export const eBusinessCard = 'E-Wizytówka';
export const eBusinessCardForX = (x: string) => `${eBusinessCard}: ${x}`;
export const emptySlot = 'Pusty slot';
export const endOfScheduleItemMessage = (relativeTime: string) => `Koniec: ${relativeTime}`;
export const exportCTA = 'Eksportuj';
export const goBackCTA = 'Wróć';
export const groupModes = {
    'full-time': 'Stacjonarne',
    'part-time': 'Niestacjonarne',
} as const;
export const groupStages = {
    bachelor: 'Licencjackie',
    master: 'Magisterskie',
    uniform: 'Jednolite magisterskie',
} as const;
export const highlightOnlineOnlyDays = 'Podkreśl dni tylko online';
export const howToAddICalToGoogleCalendarLinkTitle = 'Jak dodać plany zajęć do Kalendarza Google?';
export const hideXCTA = (x: string) => `Ukryj "${x}"`;
export const installPWAHeader = 'Dodaj aplikację';
export const installPWAPrompt = 'Zainstaluj';
export const inX = (x: string) => `w: ${x}`;
export const longBreakMessage = (durationMs: number) => `Długa przerwa: ${durationHoursAndMinutesShort(durationMs)}`;
export const nHiddenSubjects = (n: number) => {
    if (n === 1) {
        return '1 ukryty przedmiot';
    }

    if (n < 5) {
        return `${n} ukryte przedmioty`;
    }

    return `${n} ukrytych przedmiotów`;
};
export const noSavedSchedulesMessage = 'Brak zapisanych planów zajęć';
export const noScheduleItemsMessage = 'Brak zajęć';
export const nSemester = (n: number) => `${n} semestr`;
export const nYear = (n: number) => `${n} rok`;
export const officialSchedule = 'Oficjalny plan zajęć';
export const officialScheduleFor = (scheduleName: string) => `Oficjalny plan zajęć dla "${scheduleName}"`;
export const online = 'Online';
export const otherLinks = 'Inne';
export const saveCTA = 'Zapisz';
export const saveScheduleCTA = 'Zapisz plan zajęć';
export const savedSchedules = 'Zapisane plany zajęć';
export const schedulePeriodCategoryPresets = 'Rekomendowane';
export const schedulePeriodCategoryOthers = 'Inne';
export const schedulePeriodPresets = {
    inferUpcoming: 'Nadchodzące zajęcia',
    inferCurrentYear: 'Obecny rok',
} as const;
export const scheduleTypeNames = {
    group: 'Grupy',
    lecturer: 'Wykładowcy',
    room: 'Sale',
} as const;
export const searchCTA = 'Szukaj';
export const selectGroupModeCTA = 'Wybierz formę studiów';
export const selectGroupStageCTA = 'Wybierz stopień studiów';
export const selectLanguageCTA = 'Wybierz język';
export const selectLanguageLevelCTA = 'Wybierz poziom języka';
export const selectSemesterCTA = 'Wybierz semestr';
export const selectedScheduleSectionNames = {
    group: 'Wybrane grupy',
    lecturer: 'Wybrani wykładowcy',
    room: 'Wybrane sale',
} as const;
export const selectScheduleCTAs = {
    group: 'Wybierz grupę',
    lecturer: 'Wybierz wykładowcę',
    room: 'Wybierz salę',
} as const;
export const selectScheduleGenericCTA = 'Wybierz plan zajęć';
export const settings = 'Ustawienia';
export const shareCTA = 'Udostępnij';
export const showLongBreaks = 'Pokazuj długie przerwy';
export const showXCTA = (x: string) => `Pokaż "${x}"`;
export const subjects = 'Przedmioty';
export const subjectDetailsRemainingSectionHeader = 'Pozostało:';
export const subjectDetailsItemListHeader = 'Lista zajęć';
export const subjectDetailsLecturersSectionHeader = 'Prowadzący:';
export const subjectDetailsGroupsSectionHeader = 'Grupy:';
export const refreshCTA = 'Odśwież';
export const removeCTA = 'Usuń';
export const removeSavedScheduleCTA = 'Usuń zapisany plan zajęć';
export const removeXCTA = (x: string) => `Usuń "${x}"`;
export const unexpectedErrorHasOccured = 'Wystąpił nieoczekiwany błąd';
export const unnamedPlaceholder = '<bez nazwy>';
export const useSearchToSeeMoreLecturers = 'Wpisz nazwę wykładowcy aby zobaczyć więcej wyników';
export const timePeriod = 'Okres czasu';
export const timeXOutOfY = (x: number, y: number) =>
    `${durationHoursAndMinutesShort(x)} (z ${durationHoursAndMinutesShort(y)})`;
export const timeZoneMismatchMessage = `Daty są podane w strefie czasowej "${TIME_ZONE.UEK}", twoja strefa czasowa to "${TIME_ZONE.BROWSER}".`;
export const toggleXCTA = (x: string) => `Przełącz "${x}"`;

export * as labels from './labels';
