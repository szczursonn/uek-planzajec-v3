import icons from '../../assets/icons.svg';

export type IconName =
    | 'burgerMenu'
    | 'plus'
    | 'export'
    | 'chevronDown'
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
    | 'info'
    | 'eyeShow'
    | 'eyeHide'
    | 'arrowLeft'
    | 'roman1'
    | 'roman2';

export const Icon = ({ name, class: className }: { name: IconName; class?: string }) => (
    <svg class={className} fill="currentColor">
        <use href={`${icons}#${name}`}></use>
    </svg>
);
