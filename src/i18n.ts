// 中英双语。中文在根路径（/、/fydeos/），英文在 /en/ 下（/en/、/en/fydeos/），两边页面一一对应。
// 多个组件共用的文案放在这里；只在一个组件里用的，写在那个组件顶部。

export type Lang = 'zh' | 'en';

export const LANGS = {
  zh: { htmlLang: 'zh-CN', ogLocale: 'zh_CN', prefix: '' },
  en: { htmlLang: 'en', ogLocale: 'en_US', prefix: '/en' },
} as const;

// 当前页面的语言。Astro.currentLocale 来自 astro.config.mjs 的 i18n 配置，MDX 里渲染的组件也能拿到。
export const langOf = (astro: { currentLocale?: string }): Lang => (astro.currentLocale === 'en' ? 'en' : 'zh');

// 站内路径加上语言前缀：localePath('en', '/fydeos/') → '/en/fydeos/'
export const localePath = (lang: Lang, path: string) => `${LANGS[lang].prefix}${path}`;

// 同一页在另一种语言下的路径：/fydeos/ ↔ /en/fydeos/
export const switchPath = (pathname: string, to: Lang) => localePath(to, pathname.replace(/^\/en(?=\/|$)/, '') || '/');

export const ui = {
  zh: {
    skip: '跳到主要内容',
    home: '返回首页',
    hello: '打个招呼',
    switchTo: 'English',
  },
  en: {
    skip: 'Skip to main content',
    home: 'Back to home',
    hello: 'Say hi',
    switchTo: '中文',
  },
} satisfies Record<Lang, Record<string, string>>;
