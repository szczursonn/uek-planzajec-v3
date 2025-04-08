import { formatError } from '../../lib/errors';
import { labels } from '../../lib/intl/labels';
import { Icon } from '../common/Icon';

export const SelectorErrorAlert = ({ error }: { error: unknown }) => (
    <div class="bg-x-bg-error border-x-bg-error-darker text-x-text-error my-auto flex flex-col items-center gap-2 rounded-xl p-4">
        <Icon name="alert" class="h-16 w-16" />
        <p class="text-lg">{labels.unexpectedErrorHasOccured}</p>
        <pre class="bg-x-bg-error-darker max-h-96 min-w-1/2 overflow-y-auto rounded-md p-2 text-left font-mono text-sm">
            {formatError(error)}
        </pre>
    </div>
);
