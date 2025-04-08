export const byScheduleType = {
    group: {
        name: 'Grupa',
        selected: 'Wybrane grupy',
        addAnotherCTA: 'Dodaj kolejną grupę',
    },
    lecturer: {
        name: 'Wykładowca',
        selected: 'Wybrani wykładowcy',
        addAnotherCTA: 'Dodaj kolejnego wykładowcę',
    },
    room: {
        name: 'Sala',
        selected: 'Wybrane sale',
        addAnotherCTA: 'Dodaj kolejną salę',
    },
} as const;
export const bySchedulePeriod = {
    upcoming: 'Nadchodzące zajęcia',
    currentYear: 'Obecny rok',
    lastYear: 'Poprzedni rok',
} as const;
export const appTitle = 'Plan zajęć UEK';
export const appDescription = 'Nieoficjalny plan zajęć Uniwersytetu Ekonomicznego w Krakowie';
export const loading = 'Ładowanie...';
export const scheduleItemSubjects = 'Przedmioty';
export const scheduleItemEmptySubjectPlaceholder = '<bez nazwy>';
export const showLanguageSlots = 'Pokazuj sloty na lektoraty';
export const showLongBreaks = 'Pokazuj długie przerwy';
export const selectScheduleCTA = 'Wybierz plan zajęć';
export const selectDifferentScheduleCTA = 'Wybierz inny plan zajęć';
export const exportCTA = 'Eksportuj';
export const shareCTA = 'Udostępnij';
export const copyCTA = 'Skopiuj';
export const refreshCTA = 'Odśwież';
export const addCTA = 'Dodaj';
export const addURLToGoogleCalendarMessage =
    'Dodaj ten adres do Kalendarza Google lub innego kalendarza wspierającego .ics/.ical';
export const howToAddICalToGoogleCalendarMessage = 'Jak dodać plany zajęć do Kalendarza Google?';
export const eBusinessCard = 'e-Wizytówka';
export const online = 'Online';
export const showX = (x: string) => `Pokaż "${x}"`;
export const hideX = (x: string) => `Ukryj "${x}"`;
export const removeCTA = 'Usuń';
export const removeCTAx = (x: string) => `Usuń "${x}"`;
export const scheduleItemInRoom = (roomName: string) => `w: ${roomName}`;
export const scheduleItemInProgress = 'W toku';
export const durationHoursAndMinutesShort = (durationMs: number) => {
    let minutes = Math.round(durationMs / (1000 * 60));
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
export const longBreakMessage = (durationMs: number) => `Długa przerwa: ${durationHoursAndMinutesShort(durationMs)}`;
export const unexpectedErrorHasOccured = 'Wystąpił nieoczekiwany błąd';
export const checkIfOfficialScheduleIsWorkingMessage =
    'Sprawdź czy oficjalny plan zajęć działa poprawnie i spróbuj ponownie.';
export const officialSchedule = 'Oficjalny plan zajęć';
export const officialSchedules = 'Oficjalne plany zajęć';
export const officialScheduleFor = (scheduleName: string) => `Oficjalny plan zajęć dla "${scheduleName}"`;
export const scheduleIdPlaceholder = 'ID planu zajęć';
export const invalidScheduleIdMessage = 'Niepoprawne ID planu zajęć';
export const savedSchedules = 'Zapisane plany zajęć';
export const saveCTA = 'Zapisz';
export const duplicateSavedScheduleErrorMessage = 'Już istnieje taki zapisany plan zajęć';
export const moveDownCTA = 'Przesuń w dół';
export const moveUpCTA = 'Przesuń w górę';
export const remaining = 'Pozostało';
export const timeXOutOfY = (x: number, y: number) =>
    `${durationHoursAndMinutesShort(x)} (z ${durationHoursAndMinutesShort(y)})`;
export const details = 'Szczegóły';
export const noSavedSchedulesMessage = 'Brak zapisanych planów zajęć';
export const overwriteCTA = 'Nadpisz';
export const openInNewTab = 'Otwórz w nowej karcie';
export const listOfScheduleItems = 'Lista zajęć';
export const end = 'Koniec';
export const outdatedAppVersionMessage = 'Dostępna jest aktualizacja aplikacji';

export * as labels from './labels';
