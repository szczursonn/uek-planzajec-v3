import { useState } from 'preact/hooks';
import clsx from 'clsx';
import { Icon } from '../common/Icon';
import { SelectorLinkList, type SelectorLinkListItem } from './SelectorLinkList';

export type SelectorNestableLinkListGroup = {
    label: string;
    childGroups?: SelectorNestableLinkListGroup[];
    items?: SelectorLinkListItem[];
};

const NEST_LEVEL_CLASSES = [
    {
        button: 'text-2xl md:text-3xl font-extrabold',
        icon: 'h-4 w-4',
    },
    {
        button: 'text-xl md:text-2xl font-bold',
        icon: 'h-3.5 w-3.5',
    },
    {
        button: 'text-lg md:text-xl font-semibold',
        icon: 'h-3 w-3',
    },
];
const getNestLevelClass = (nestLevel: number) => NEST_LEVEL_CLASSES[nestLevel] ?? NEST_LEVEL_CLASSES.at(-1)!;

const SelectorNestableLinkListGroupCmp = ({
    nestLevel,
    group,
}: {
    nestLevel: number;
    group: SelectorNestableLinkListGroup;
}) => {
    const [isOpen, setIsOpen] = useState(true);

    const nestLevelClass = getNestLevelClass(nestLevel);

    return (
        <li key={group.label}>
            <button
                class={clsx(
                    'hover:bg-x-bg-tertiary outline-x-cta-primary flex w-full cursor-pointer items-center gap-2 rounded p-2 transition-all focus-visible:outline-2',
                    nestLevelClass.button,
                    !isOpen && 'opacity-60',
                )}
                type="button"
                onClick={() => setIsOpen((v) => !v)}
            >
                <Icon
                    name="chevronDown"
                    class={clsx('transition-transform', nestLevelClass.icon, isOpen && 'rotate-180')}
                />
                <span>{group.label}</span>
            </button>
            {isOpen && (
                <>
                    {!!group.childGroups?.length && (
                        <SelectorNestableLinkList nestLevel={nestLevel + 1} groups={group.childGroups} />
                    )}
                    {!!group.items && <SelectorLinkList items={group.items} />}
                </>
            )}
        </li>
    );
};

export const SelectorNestableLinkList = ({
    nestLevel = 0,
    groups,
}: {
    nestLevel?: number;
    groups: SelectorNestableLinkListGroup[];
}) => (
    <ul class="flex flex-col gap-4">
        {groups.map((group) => (
            <SelectorNestableLinkListGroupCmp key={group.label} nestLevel={nestLevel} group={group} />
        ))}
    </ul>
);
