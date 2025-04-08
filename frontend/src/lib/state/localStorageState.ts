import { useCallback, useEffect, useState } from 'preact/hooks';

const KEY_PREFIX = 'uekpz3_';

const registerStorageEventCallback = (() => {
    const keyToSubscribers = {} as Record<string, ((newValue: string) => void)[]>;

    window.addEventListener('storage', (event) => {
        if (event.storageArea === window.localStorage) {
            const callbacksToExecute =
                event.key === null ? Object.values(keyToSubscribers).flat() : (keyToSubscribers[event.key] ?? []);
            callbacksToExecute.forEach((cb) => cb(event.newValue ?? ''));
        }
    });

    return (key: string, callback: (newValue: string) => void) => {
        keyToSubscribers[key] = keyToSubscribers[key] ?? [];
        keyToSubscribers[key].push(callback);
    };
})();

export const createLocalStorageState = <TValue>(
    unprefixedKey: string,
    decode: (encodedValue: string) => TValue,
    encode: (value: TValue) => string,
) => {
    const key = KEY_PREFIX + unprefixedKey;
    const currentValueStore = (() => {
        let value = decode(window.localStorage.getItem(key) ?? '');
        const subscribers = [] as (() => void)[];

        return {
            get: () => value,
            set: (newValue: TValue) => {
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

                value = newValue;
                subscribers.forEach((cb) => cb());
            },
            subscribe: (callback: () => void) => {
                subscribers.push(callback);
                return () => {
                    const callbackIndex = subscribers.indexOf(callback);
                    if (callbackIndex !== -1) {
                        subscribers.splice(callbackIndex, 1);
                    }
                };
            },
        } as const;
    })();

    registerStorageEventCallback(key, (newEncodedValue) => currentValueStore.set(decode(newEncodedValue)));

    return {
        use: () => {
            const [localCurrentValue, setLocalCurrentValue] = useState(currentValueStore.get);

            useEffect(
                () => currentValueStore.subscribe(() => setLocalCurrentValue(currentValueStore.get)),
                [setLocalCurrentValue],
            );

            return localCurrentValue;
        },
        useAsInitial: () => {
            const [localValue, setLocalValue] = useState(currentValueStore.get);

            const setValueAndPropagate = useCallback(
                (newValue: TValue) => {
                    setLocalValue(newValue);
                    currentValueStore.set(newValue);
                },
                [setLocalValue],
            );

            return [localValue, setValueAndPropagate] as const;
        },
        get: currentValueStore.get,
        set: currentValueStore.set,
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
        (value) => (value ? '1' : '0'),
    );
