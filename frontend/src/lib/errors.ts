export const formatError = (error: unknown) => {
    if (error instanceof Error) {
        return [[error.name, error.message].filter(Boolean).join(': '), error.stack].filter(Boolean).join('\n');
    }

    return String(error);
};
