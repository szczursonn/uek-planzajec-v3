import { exec } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import type { HtmlTagDescriptor, PluginOption } from 'vite';
import type { PluginContext } from 'rollup';
import sharp from 'sharp';
import { labels } from './lib/intl/labels';
import { VERSION_META_TAG_NAME } from './lib/versionInfo';

const PLUGIN_NAME = 'uekpz3-custom-build-plugin';
const DEV_ASSET_PREFIX = 'uekpz3-asset-dev-';

class CustomAsset {
    public href: string;

    constructor(
        readonly name: string,
        readonly getContent: () => Promise<Buffer>,
        readonly immutable = true,
    ) {
        this.href = `/${DEV_ASSET_PREFIX}${this.name}`;
    }

    async emitFile(ctx: PluginContext) {
        const referenceId = ctx.emitFile({
            type: 'asset',
            [this.immutable ? 'name' : 'fileName']: this.name,
            source: await this.getContent(),
        });

        this.href = `/${ctx.getFileName(referenceId)}`;
    }
}

const getGitDescribe = () =>
    new Promise<string | null>((resolve) =>
        exec('git describe --tags --always --dirty', (err, stdout, stderr) => {
            if (err) {
                console.error(`[${PLUGIN_NAME}] failed to check if dirty`, err, 'stderr:', stderr);
                resolve(null);
            } else {
                resolve(stdout.trim() || null);
            }
        }),
    );

export const customBuildPlugin = (): PluginOption => {
    const largeIconAsset = new CustomAsset('icon-512x512.png', () =>
        readFile('src/assets/icon-512x512.png').then((buff) =>
            sharp(buff)
                .png({
                    compressionLevel: 9,
                    adaptiveFiltering: true,
                })
                .toBuffer(),
        ),
    );
    const smallIconAsset = new CustomAsset('icon-192x192.png', () =>
        readFile('src/assets/icon-512x512.png').then((buff) =>
            sharp(buff)
                .resize(192, 192)
                .png({
                    compressionLevel: 9,
                    adaptiveFiltering: true,
                })
                .toBuffer(),
        ),
    );
    const faviconAsset = new CustomAsset('favicon.png', () =>
        readFile('src/assets/icon-512x512.png').then((buff) =>
            sharp(buff)
                .resize(16, 16)
                .png({
                    compressionLevel: 9,
                    adaptiveFiltering: true,
                })
                .toBuffer(),
        ),
    );
    const webmanifestAsset = new CustomAsset(
        'manifest.webmanifest',
        () =>
            Promise.resolve(
                Buffer.from(
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
                                src: smallIconAsset.href,
                                sizes: '192x192',
                                type: 'image/png',
                            },
                            {
                                src: largeIconAsset.href,
                                sizes: '512x512',
                                type: 'image/png',
                            },
                        ],
                    }),
                ),
            ),
        false,
    );

    const allAssetsInProcessingOrder = [largeIconAsset, smallIconAsset, faviconAsset, webmanifestAsset];

    return {
        name: PLUGIN_NAME,
        async generateBundle() {
            for (const asset of allAssetsInProcessingOrder) {
                await asset.emitFile(this);
            }
        },
        async transformIndexHtml() {
            const tagsToAdd = [
                { tag: 'title', children: labels.appTitle },
                {
                    tag: 'meta',
                    attrs: {
                        property: 'og:site_name',
                        content: labels.appTitle,
                    },
                },
                {
                    tag: 'meta',
                    attrs: {
                        name: 'description',
                        content: labels.appDescription,
                    },
                },
                {
                    tag: 'meta',
                    attrs: {
                        property: 'og:description',
                        content: labels.appDescription,
                    },
                },
                {
                    tag: 'link',
                    attrs: {
                        rel: 'icon',
                        type: 'image/png',
                        href: faviconAsset.href,
                    },
                },
                {
                    tag: 'link',
                    attrs: {
                        rel: 'manifest',
                        href: webmanifestAsset.href,
                    },
                },
            ] as HtmlTagDescriptor[];

            const gitDescribe = await getGitDescribe();
            if (gitDescribe !== null) {
                tagsToAdd.push({
                    tag: 'meta',
                    attrs: {
                        name: VERSION_META_TAG_NAME,
                        content: gitDescribe,
                    },
                });
            }

            return tagsToAdd;
        },
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const matchingAsset = allAssetsInProcessingOrder.find((asset) => req.url?.startsWith(asset.href));
                if (!matchingAsset) {
                    next();
                    return;
                }

                try {
                    const assetContent = await matchingAsset.getContent();
                    res.writeHead(200, {
                        'Cache-Control': 'no-cache',
                    }).end(assetContent);
                } catch (err) {
                    console.error(`[${PLUGIN_NAME}] failed to serve asset`, err);
                    res.writeHead(500).end();
                }
            });
        },
    };
};
