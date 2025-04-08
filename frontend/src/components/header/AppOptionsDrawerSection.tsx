import type { ComponentChildren } from 'preact';

export const AppOptionsDrawerSection = ({ title, children }: { title: string; children?: ComponentChildren }) => {
    return (
        <div class="w-full">
            <p class="text-x-text-default-muted mb-1 text-sm font-semibold">{title}</p>
            {children}
        </div>
    );
};
