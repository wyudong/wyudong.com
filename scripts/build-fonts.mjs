// 按全站实际用字裁字体，dev / build / check 前自动运行。
// 输出 src/assets/fonts/*.woff2 和 src/styles/fonts.generated.css，都是生成物，不进 git。
// 改了页面文字之后重新跑一次：pnpm fonts（或重启 dev）。
//
// 两套字体，字重轴都收窄到 400–600，每套只出一个文件：
//   Plus Jakarta Sans  英文字母、数字和英文标点。排在 font-family 最前面。
//   Noto Sans SC       中文，以及英文字体范围以外的所有字符。
//
// 英文页另有一个字体名 Plus Jakarta Sans Punct，指向同一个英文字体文件，只管撇号、引号、破折号、省略号，
// 在 :lang(en) 下排到最前面（见 src/styles/global.css）。中文页不受影响。
//
// 英文首页的轮播标题用斜体 Plus Jakarta Sans Italic：只含可打印 ASCII，字重固定 600，
// 只在英文首页用到、只在那一页预加载（src/pages/en/index.astro），别的页面不会下载。
//
// 每个文件都包含全站所有页面用到的字。src/layouts/Base.astro 在 <head> 里预加载这两个文件，
// 打开任何一页都会马上下载全部字体，换页直接用缓存。
//
// 源字体是 Google Fonts 仓库里完整的可变字体，固定到某次提交。Fontsource 的包只有按 unicode-range 切好的分片，
// 分片没法合成一个文件。第一次运行时下载到 node_modules/.cache/fonts/，之后用缓存。
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontDir = join(root, 'src/assets/fonts');
const cacheDir = join(root, 'node_modules/.cache/fonts');
const cssOut = join(root, 'src/styles/fonts.generated.css');
const WEIGHT = { min: 400, max: 600 };

const LATIN = {
  family: 'Plus Jakarta Sans Variable',
  out: 'plus-jakarta-sans.woff2',
  url: 'https://raw.githubusercontent.com/google/fonts/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf',
  sha256: '89b3fb38aa0d275d7a731d0d817a4f1622b316b4d7fbdedcf02ee9099ff68bc8',
};
const LATIN_ITALIC = {
  family: 'Plus Jakarta Sans Italic',
  out: 'plus-jakarta-sans-italic.woff2',
  url: 'https://raw.githubusercontent.com/google/fonts/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/plusjakartasans/PlusJakartaSans-Italic%5Bwght%5D.ttf',
  sha256: '9529eb888668b6a3c6dd75b6341a2fc5263fb6c9e788822e6117c29dd9e8b115',
  // 标题是 600，只出这一个字重，文件更小
  weight: 600,
};
const CJK = {
  family: 'Noto Sans SC Variable',
  out: 'noto-sans-sc.woff2',
  url: 'https://raw.githubusercontent.com/google/fonts/a85815a42757630ce188fdad368c2dfc444d4773/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf',
  sha256: 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da',
};

// 英文字体只接管字母、数字和英文标点。
// 空格（包括不换行空格）留给 Noto Sans SC：CSS 用「字符范围包含空格的第一个字体」计算 line-height: normal，
// 空格留在中文字体里，全站原来按中文字体排好的行高就不会变。
// 「·」「—」、中文引号、省略号、减号、箭头也不在范围里，继续用中文字体的样子。
const isLatin = (cp) => (cp > 0x20 && cp <= 0x7e) || (cp >= 0xc0 && cp <= 0x24f);

// 英文正文经 smartypants 生成的排版标点。中文页按上面的约定交给 Noto Sans SC；英文页里中文字体的这些字形太宽，
// 所以字形也放进英文字体文件，另起一个只覆盖这几个字的字体名，只在英文页启用。
const LATIN_PUNCT = 'Plus Jakarta Sans Punct';
const PUNCT = new Set([...'‘’“”–—…'].map((ch) => ch.codePointAt(0)));
const isPunct = (cp) => PUNCT.has(cp);

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

// 全站用到的字符
async function usedChars() {
  const cps = new Set();
  const add = (text) => {
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp >= 0x20) cps.add(cp);
    }
  };

  // 可打印 ASCII，Markdown 渲染时生成的排版标点，以及技术栈里用转义写的不换行空格（源码里都看不到这些字符）
  add('“”‘’—–… ');
  for (let cp = 0x20; cp <= 0x7e; cp++) add(String.fromCodePoint(cp));

  const files = (await walk(join(root, 'src'))).filter((f) => /\.(astro|mdx?|ts|css)$/.test(f) && f !== cssOut);
  for (const file of files) add(stripComments(await readFile(file, 'utf8')));
  return [...cps].sort((a, b) => a - b);
}

// 取源字体：先看缓存，没有或校验不对就下载
async function source({ url, sha256 }) {
  const sha = (buf) => createHash('sha256').update(buf).digest('hex');
  const path = join(cacheDir, decodeURIComponent(url.split('/').pop()));
  const cached = await readFile(path).catch(() => null);
  if (cached && sha(cached) === sha256) return cached;

  console.log(`fonts: 下载 ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载字体失败：${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha(buf) !== sha256) throw new Error(`字体校验不对：${url}`);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(path, buf);
  return buf;
}

// 字体 cmap 里有字形的码位（只读 TrueType 的 format 4 和 12 子表，这两套字体都够用）
function codepoints(font) {
  const tables = font.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < tables; i++) {
    const rec = 12 + i * 16;
    if (font.toString('latin1', rec, rec + 4) === 'cmap') cmap = font.readUInt32BE(rec + 8);
  }
  const cps = new Set();
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
    const sub = cmap + font.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = font.readUInt16BE(sub);
    if (format === 12) {
      for (let g = 0; g < font.readUInt32BE(sub + 12); g++) {
        const group = sub + 16 + g * 12;
        for (let cp = font.readUInt32BE(group); cp <= font.readUInt32BE(group + 4); cp++) cps.add(cp);
      }
    } else if (format === 4) {
      const segs = font.readUInt16BE(sub + 6) / 2;
      for (let s = 0; s < segs; s++) {
        const end = font.readUInt16BE(sub + 14 + s * 2);
        const start = font.readUInt16BE(sub + 16 + segs * 2 + s * 2);
        for (let cp = start; cp <= end && cp !== 0xffff; cp++) cps.add(cp);
      }
    }
  }
  return cps;
}

function toRange(cps) {
  const parts = [];
  for (let i = 0; i < cps.length; i++) {
    let j = i;
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++;
    parts.push(i === j ? `U+${cps[i].toString(16)}` : `U+${cps[i].toString(16)}-${cps[j].toString(16)}`);
    i = j;
  }
  return parts.join(',');
}

// 内容没变就不写，dev 开着时跑 pnpm fonts / pnpm build 不会触发多余的热更新
async function writeIfChanged(path, data) {
  const old = await readFile(path).catch(() => null);
  if (old?.equals(Buffer.from(data))) return;
  await writeFile(path, data);
}

// 裁成一个 woff2，返回实际有字形的码位。weight 是数字时把字重轴固定在这个值。
async function subset({ out, url, sha256, weight = WEIGHT }, cps) {
  const font = await source({ url, sha256 });
  const has = codepoints(font);
  const hit = cps.filter((cp) => has.has(cp));
  const woff2 = await subsetFont(font, String.fromCodePoint(...hit), {
    targetFormat: 'woff2',
    variationAxes: { wght: weight },
  });
  await writeIfChanged(join(fontDir, out), woff2);
  return { hit, bytes: woff2.length, missing: cps.filter((cp) => !has.has(cp)) };
}

// 给了 range 就在 @font-face 里写 unicode-range，只让这个字体名显示这些字
const fontFace = (family, out, range, { style = 'normal', weight = `${WEIGHT.min} ${WEIGHT.max}` } = {}) =>
  `@font-face{font-family:"${family}";font-style:${style};font-display:swap;font-weight:${weight};` +
  `src:url("../assets/fonts/${out}") format("woff2")${range ? `;unicode-range:${toRange(range)}` : ''}}`;

const used = await usedChars();
// 不先清空目录。dev 开着时字体文件哪怕只消失一下，dev server 也会一直当它不存在、不再改写字体地址，
// 英文页的字体请求 404，引号、撇号退回中文字体变成全角，只能重启 dev。
// 所以原地覆盖，最后只删不再生成的旧文件。
await mkdir(fontDir, { recursive: true });

const latin = await subset(
  LATIN,
  used.filter((cp) => isLatin(cp) || isPunct(cp)),
);
const italic = await subset(
  LATIN_ITALIC,
  used.filter((cp) => cp > 0x20 && cp <= 0x7e),
);
const cjk = await subset(CJK, used);
const latinPunct = latin.hit.filter(isPunct);
const faces = [
  fontFace(LATIN.family, LATIN.out, latin.hit.filter(isLatin)),
  // 空 range 会变成不限字符，所以没有标点字形就不写这一条
  ...(latinPunct.length ? [fontFace(LATIN_PUNCT, LATIN.out, latinPunct)] : []),
  fontFace(LATIN_ITALIC.family, LATIN_ITALIC.out, italic.hit, { style: 'italic', weight: LATIN_ITALIC.weight }),
  // 中文字体不写 unicode-range：英文字体不显示的字都落到它上面，每页都会用到
  fontFace(CJK.family, CJK.out),
];
await writeIfChanged(cssOut, `/* 由 scripts/build-fonts.mjs 生成，不要手改 */\n${faces.join('\n')}\n`);
const outputs = new Set([LATIN.out, LATIN_ITALIC.out, CJK.out]);
for (const name of await readdir(fontDir)) {
  if (!outputs.has(name)) await rm(join(fontDir, name), { recursive: true, force: true });
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const missing = cjk.missing.filter((cp) => cp > 0x7e);
console.log(
  `fonts: ${used.length} 个字符；Plus Jakarta Sans ${kb(latin.bytes)}` +
    (latin.missing.length ? `（缺 ${String.fromCodePoint(...latin.missing)}，由 Noto Sans SC 显示）` : '') +
    `；Plus Jakarta Sans Italic ${kb(italic.bytes)}` +
    `；Noto Sans SC ${kb(cjk.bytes)}` +
    (missing.length ? `；两套字体都没有、会回落系统字体的字符：${String.fromCodePoint(...missing)}` : ''),
);
