// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';

const SITE = 'https://wyudong.com';

// 正文里指向外站的链接在新标签页打开；站内链接和锚点不变。MDX 默认继承 markdown.processor。
/** @type {import('satteri').HastPluginDefinition} */
const externalLinksInNewTab = {
  name: 'external-links-in-new-tab',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties.href;
      if (typeof href === 'string' && /^https?:\/\//.test(href) && new URL(href).origin !== SITE) {
        ctx.setProperty(node, 'target', '_blank');
        ctx.setProperty(node, 'rel', ['noopener']);
      }
    },
  },
};

export default defineConfig({
  site: SITE,

  // 正文代码块用浅色高亮，底色由 src/styles/article.css 统一
  markdown: {
    processor: satteri({ hastPlugins: [externalLinksInNewTab] }),
    shikiConfig: { theme: 'github-light' },
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      // 字体文件不内联成 base64：内联会塞进每页都要先下载的 CSS，挡住首屏渲染；单独的文件可以预加载、缓存
      assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
    },
  },

  integrations: [mdx()],
});
