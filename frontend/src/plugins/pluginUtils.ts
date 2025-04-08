import type { ResolvedConfig } from 'vite';
import type { PluginContext } from 'rollup';
import { basename, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

export const createAssetURLGenerator = (rootDirPath: string) => {
    const filePathToReferenceId = new Map<string, string>();
    const filePaths: string[] = [];
    let isServeMode = false;

    return {
        handleConfigResolved: (config: ResolvedConfig) => {
            isServeMode = config.command === 'serve';
        },
        handleBuildStart: async function (this: PluginContext) {
            if (isServeMode) {
                return;
            }

            await Promise.all(
                filePaths.map(async (filePath) => {
                    filePathToReferenceId.set(
                        filePath,
                        this.emitFile({
                            type: 'asset',
                            name: basename(filePath),
                            source: await readFile(resolve(rootDirPath, filePath)),
                        }),
                    );
                }),
            );
        },
        add: (filePath: string) => {
            filePaths.push(filePath);
            const getReferenceId = () => {
                const referenceId = filePathToReferenceId.get(filePath);
                if (!referenceId) {
                    throw new Error(`no reference id for file "${filePath}"`);
                }

                return referenceId;
            };

            return {
                filePath,
                // build+dev
                placeholder: () => (isServeMode ? `/${filePath}` : `__VITE_ASSET__${getReferenceId()}__`),
                // build only
                url: (ctx: PluginContext) => '/' + ctx.getFileName(getReferenceId()),
            } as const;
        },
    } as const;
};
