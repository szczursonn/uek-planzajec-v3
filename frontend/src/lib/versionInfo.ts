export const VERSION_META_TAG_NAME = 'uekpz3-version';

export const appVersion =
    globalThis?.document?.querySelector(`meta[name="${VERSION_META_TAG_NAME}"]`)?.getAttribute('content') || 'unknown';
