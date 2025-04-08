export const TIME_ZONE = {
    UEK: 'Europe/Warsaw',
    BROWSER: Intl.DateTimeFormat().resolvedOptions().timeZone,
} as const;
