import icons from '../../assets/icons.svg';

export type IconName =
    | 'burgerMenu'
    | 'plus'
    | 'export'
    | 'chevronDown'
    | 'chevronUp'
    | 'pin'
    | 'person'
    | 'search'
    | 'cross'
    | 'alert'
    | 'share'
    | 'copy'
    | 'check'
    | 'group'
    | 'externalLink'
    | 'threeDots'
    | 'save'
    | 'info';

export const Icon = ({ name, class: className }: { name: IconName; class?: string }) => (
    <svg class={className} fill="currentColor">
        <use xlinkHref={`${icons}#${name}`}></use>
    </svg>
);
