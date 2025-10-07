import { useEffect, useState } from 'preact/hooks';

const listeners = [] as (() => void)[];
const notifyListeners = () => listeners.forEach((cb) => cb());

let deferredEvent = null as Event | null;

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredEvent = event;
    notifyListeners();
});

export const showPWAPrompt = async () => {
    if (deferredEvent === null) {
        throw new Error('pwa prompt is unavailable');
    }
    const event = deferredEvent;
    deferredEvent = null;
    notifyListeners();

    try {
        await (event as any).prompt();
    } catch (err) {
        console.error('[pwa-prompt]', err);
    }
};

export const usePWAPromptAvailability = () => {
    const [isAvailable, setIsAvailable] = useState(deferredEvent !== null);

    useEffect(() => {
        const callback = () => setIsAvailable(deferredEvent !== null);

        listeners.push(callback);
        return () => {
            listeners.splice(listeners.indexOf(callback), 1);
        };
    }, [setIsAvailable]);

    return isAvailable;
};
