import { useEffect, useRef } from 'preact/hooks';
import { labels } from '../../lib/intl/labels';
import { Icon } from './Icon';

export const SearchInput = ({
    value,
    placeholder = labels.searchCTA,
    focusOnRender = false,
    onChange,
}: {
    value: string;
    placeholder?: string;
    focusOnRender?: boolean;
    onChange: (newValue: string) => void;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (focusOnRender) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, []);

    return (
        <div class="relative">
            <input
                ref={inputRef}
                class="border-x-bg-quaternary bg-x-bg-tertiary focus-visible:outline-x-cta-primary w-full rounded border-2 p-2 pl-10 focus-visible:outline-2"
                type="search"
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.currentTarget.value)}
            />
            <Icon name="search" class="text-x-text-default-muted pointer-events-none absolute top-3 left-3 h-5 w-5" />
        </div>
    );
};
