import type { ComponentChildren } from 'preact';
import { anchorPushStateHandler } from '../../lib/state/queryParamsState';

export const SelectorTileLinkList = ({ title, children }: { title?: string; children: ComponentChildren }) => (
    <div class="my-auto flex h-full flex-col items-center justify-center gap-8 lg:gap-16">
        {title && <span class="text-center text-4xl font-bold lg:text-5xl">{title}</span>}
        <div class="flex w-full flex-wrap items-center justify-center gap-12">{children}</div>
    </div>
);

export const SelectorTileLink = ({
    label,
    href,
    children,
}: {
    label: string;
    href: string;
    children?: ComponentChildren;
}) => (
    <a
        class="border-x-cta-darker bg-x-bg-tertiary hover:bg-x-bg-quaternary active:bg-x-bg-quinary hover:border-x-cta-primary focus-visible:border-x-cta-primary shadow-x-bg-primary flex aspect-square h-32 shrink-0 grow cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-4 p-4 shadow-2xl transition-all hover:scale-105 hover:border-6 focus-visible:scale-105 focus-visible:border-6 focus-visible:outline-0 active:scale-110 lg:h-48"
        title={label}
        target="_blank"
        href={href}
        onClick={anchorPushStateHandler}
    >
        {children}
        <span class="max-w-full text-center font-semibold text-wrap lg:text-xl">{label}</span>
    </a>
);

export const SelectorTileLinkListSkeleton = ({ childCount }: { childCount: number }) => {
    return (
        <div class="my-auto flex h-full flex-col items-center justify-center gap-8">
            <div class="bg-x-bg-quaternary h-10 w-96 animate-pulse rounded-xl" />
            <div class="flex w-full flex-wrap items-center justify-center gap-12">
                {Array.from(Array(childCount).keys()).map((i) => (
                    <div
                        key={i}
                        class="border-x-cta-darker bg-x-bg-quaternary shadow-x-bg-primary flex aspect-square h-32 animate-pulse flex-col items-center justify-center gap-2 rounded-3xl border-4 p-4 shadow-2xl transition-all lg:h-48"
                    />
                ))}
            </div>
        </div>
    );
};
