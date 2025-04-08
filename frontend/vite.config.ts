import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { versionInfoPlugin } from './src/plugins/versionInfo';
import { transformIndexHTML } from './src/plugins/transformIndexHTML';
import { generateWebManifestPlugin } from './src/plugins/generateWebManifest';

export default ({ mode }: { mode: string }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

    return defineConfig({
        plugins: [
            preact(),
            tailwindcss(),
            versionInfoPlugin(__dirname),
            transformIndexHTML(__dirname),
            generateWebManifestPlugin(__dirname),
        ],
        server: {
            proxy: {
                '/api': {
                    target: `http://localhost:${process.env.UEKPZ3_PORT || '4000'}`,
                    changeOrigin: true,
                },
            },
        },
    });
};
