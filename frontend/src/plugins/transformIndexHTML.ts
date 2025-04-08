import type { Plugin } from 'vite';
import { labels } from '../lib/labels';
import { createAssetURLGenerator } from './pluginUtils';

export const transformIndexHTML = (rootDirPath: string): Plugin => {
    const assetURLGenerator = createAssetURLGenerator(rootDirPath);
    const faviconAsset = assetURLGenerator.add('src/assets/favicon.png');

    return {
        name: 'uekpz3-transform-index-html',
        configResolved: assetURLGenerator.handleConfigResolved,
        buildStart: assetURLGenerator.handleBuildStart,
        transformIndexHtml(html) {
            html = html.replaceAll('%uekpz3-title%', labels.appTitle);
            html = html.replaceAll('%uekpz3-description%', labels.appDescription);
            html = html.replace('%uekpz3-favicon%', faviconAsset.placeholder());

            return html;
        },
    };
};
