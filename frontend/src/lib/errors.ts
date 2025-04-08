import * as z from '@zod/mini';

export const formatError = (error: unknown) => {
    if (error instanceof z.core.$ZodError) {
        return z.treeifyError(error).errors.join('\n');
    }

    if (error instanceof Error) {
        return [[error.name, error.message].filter(Boolean).join(': '), error.stack].filter(Boolean).join('\n');
    }

    return String(error);
};
