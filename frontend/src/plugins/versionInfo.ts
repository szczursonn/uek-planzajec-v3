import type { PluginOption } from 'vite';
import { exec } from 'node:child_process';

const getDescribe = (rootDirPath: string) =>
    new Promise<string | null>((resolve) =>
        exec('git describe --tags --always --dirty', { cwd: rootDirPath }, (err, stdout, stderr) => {
            if (err) {
                console.error('[version-info-plugin] failed to check if dirty', err, 'stderr:', stderr);
                resolve(null);
            } else {
                resolve(stdout.trim() || null);
            }
        }),
    );

const virtualModuleId = 'virtual:version-info';
const resolvedVirtualModuleId = '\0' + virtualModuleId;

export const versionInfoPlugin = (rootDirPath: string): PluginOption => {
    return {
        name: 'uekpz3-version-info',
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId;
            }
        },
        async load(id) {
            if (id === resolvedVirtualModuleId) {
                const describe = await getDescribe(rootDirPath);

                return `export const appVersion = ${JSON.stringify(describe)};`;
            }
        },
    };
};
