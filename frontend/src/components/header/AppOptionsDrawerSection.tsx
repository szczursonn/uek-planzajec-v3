import type { ComponentChildren } from 'preact';

export const AppOptionsDrawerSection = ({ title, children }: { title: string; children?: ComponentChildren }) => {
    return (
        <div class="w-full">
            <p class="border-x-bg-quinary my-1 border-y-3 p-0.5 text-center font-semibold">{title}</p>
            {children}
        </div>
    );
};
