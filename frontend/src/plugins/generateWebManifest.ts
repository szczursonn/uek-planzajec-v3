import { type PluginOption } from 'vite';
import { labels } from '../lib/labels';
import { createAssetURLGenerator } from './pluginUtils';

const getWebManifestJSON = ({ icon192URL, icon512URL }: { icon192URL: string; icon512URL: string }) =>
    JSON.stringify({
        name: labels.appTitle,
        short_name: labels.appTitle,
        description: labels.appDescription,
        start_url: '/?pwa=1',
        id: 'uek-planzajec-v3',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#09090b',
        icons: [
            {
                src: icon192URL,
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: icon512URL,
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    });

export const generateWebManifestPlugin = (rootDirPath: string): PluginOption => {
    const assetURLGenerator = createAssetURLGenerator(rootDirPath);
    const icon192Asset = assetURLGenerator.add('src/assets/icon-192x192.png');
    const icon512Asset = assetURLGenerator.add('src/assets/icon-512x512.png');

    return {
        name: 'uekpz3-generate-webmanifest',
        configResolved: assetURLGenerator.handleConfigResolved,
        buildStart: assetURLGenerator.handleBuildStart,
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'manifest.webmanifest',
                source: getWebManifestJSON({
                    icon192URL: icon192Asset.url(this),
                    icon512URL: icon512Asset.url(this),
                }),
            });
        },
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url !== '/manifest.webmanifest') {
                    next();
                    return;
                }

                try {
                    const webmanifestJSON = getWebManifestJSON({
                        icon192URL: icon192Asset.placeholder(),
                        icon512URL: icon512Asset.placeholder(),
                    });

                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                    }).end(webmanifestJSON);
                } catch (err) {
                    console.error(err);
                    res.writeHead(500).end();
                }
            });
        },
    };
};
