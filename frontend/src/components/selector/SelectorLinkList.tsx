import clsx from 'clsx';
import { anchorPushStateHandler } from '../../lib/state/queryParamsState';

export type SelectorLinkListItem = {
    label: string;
    href: string;
};

export const SelectorLinkList = ({ items }: { items: SelectorLinkListItem[] }) => (
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && <span class="col-span-full text-center font-bold">-</span>}
        {items.map((item) => (
            <a
                key={item.label}
                class="hover:bg-x-bg-tertiary outline-x-cta-primary active:bg-x-bg-quaternary border-b-x-bg-quinary rounded-xs border-b-2 p-3 font-semibold transition-colors hover:underline focus-visible:outline-2"
                href={item.href}
                target="_blank"
                title={item.label}
                onClick={anchorPushStateHandler}
            >
                {item.label}
            </a>
        ))}
    </div>
);

export const SelectorLinkListSkeleton = () => (
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from(Array(8 * 3).keys()).map((i) => {
            return (
                <div
                    key={i}
                    class={clsx(
                        'bg-x-bg-tertiary h-12 w-full animate-pulse rounded-xs',
                        i % 2 === 0 && 'sm:hidden',
                        i % 4 === 0 && 'lg:hidden',
                    )}
                />
            );
        })}
    </div>
);
