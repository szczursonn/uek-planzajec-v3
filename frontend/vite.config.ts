import { cwd } from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { customBuildPlugin } from './src/customBuildPlugin';

export default ({ mode }: { mode: string }) => {
    process.env = {
        ...process.env,
        ...loadEnv(mode, cwd(), ''),
    };

    return defineConfig({
        plugins: [preact(), tailwindcss(), customBuildPlugin()],
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
