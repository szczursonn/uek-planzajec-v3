import { useCallback, useEffect, useState } from 'preact/hooks';

export const KEY_PREFIX = 'uekpz3_';

const keyToListeners = {} as Record<string, (() => void)[]>;
const notifyListeners = (key: string | null) => {
    const listenersToNotify = key === null ? Object.values(keyToListeners).flat() : (keyToListeners[key] ?? []);
    listenersToNotify.forEach((cb) => cb());
};

window.addEventListener('storage', (event) => {
    if (event.storageArea !== window.localStorage) {
        return;
    }

    notifyListeners(event.key);
});

export const createLocalStorageState = <T>(
    _key: string,
    decode: (encodedValue: string) => T,
    encode: (value: T) => string,
) => {
    const key = [KEY_PREFIX, _key].join('');
    const getFreshValue = () => decode(window.localStorage.getItem(key) ?? '');
    const setValue = (newValue: T) => {
        const encodedValue = encode(newValue);

        if (encodedValue) {
            try {
                window.localStorage.setItem(key, encodedValue);
            } catch (err) {
                console.error('[localStorageState] failed to save to local storage', err);
            }
        } else {
            window.localStorage.removeItem(key);
        }

        notifyListeners(key);
    };

    return {
        use: () => {
            const [value, setValue] = useState(getFreshValue);

            useEffect(() => {
                const callback = () => setValue(getFreshValue);

                keyToListeners[key] = keyToListeners[key] ?? [];
                keyToListeners[key].push(callback);

                return () => {
                    keyToListeners[key] = keyToListeners[key]!.filter((cb) => cb !== callback);
                    if (keyToListeners[key].length === 0) {
                        delete keyToListeners[key];
                    }
                };
            }, []);

            return value;
        },
        useAsInitial: () => {
            const [localValue, setLocalValue] = useState(getFreshValue);

            return [
                localValue,
                useCallback((newValue: typeof localValue) => {
                    setLocalValue(newValue);
                    setValue(newValue);
                }, []),
            ] as const;
        },
        get: getFreshValue,
        set: setValue,
    } as const;
};

export const createBooleanLocalStorageState = (key: string, defaultValue: boolean) =>
    createLocalStorageState(
        key,
        (encodedValue) => {
            if (encodedValue === '0') {
                return false;
            }
            if (encodedValue === '1') {
                return true;
            }
            return defaultValue;
        },
        (value) => {
            if (value === defaultValue) {
                return '';
            }
            return value ? '1' : '0';
        },
    );
