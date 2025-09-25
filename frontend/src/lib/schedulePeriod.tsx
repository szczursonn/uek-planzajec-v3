import { ComponentChildren, createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';
import * as z from 'zod/mini';

export const schedulePeriodSchema = z.union([z.enum(['inferUpcoming', 'inferCurrentYear']), z.number()]);
export type SchedulePeriod = z.infer<typeof schedulePeriodSchema>;

const useSchedulePeriodContextManager = () => {
    const [schedulePeriod, setSchedulePeriod] = useState<SchedulePeriod>('inferUpcoming');
    return [schedulePeriod, setSchedulePeriod] as const;
};

const SchedulePeriodContext = createContext<ReturnType<typeof useSchedulePeriodContextManager> | null>(null);

export const useSchedulePeriod = () => {
    const value = useContext(SchedulePeriodContext);
    if (value === null) {
        throw new Error('null context');
    }

    return value;
};

export const SchedulePeriodProvider = ({ children }: { children?: ComponentChildren }) => {
    return (
        <SchedulePeriodContext.Provider value={useSchedulePeriodContextManager()}>
            {children}
        </SchedulePeriodContext.Provider>
    );
};
