# wyudong.com · 站点说明

Astro 7 静态站，只有中文，不用 UI 框架。本文是站点唯一的现行文档，记录当前实现、约定和取舍，和代码一起维护。

核对日期：2026-10-05。

## 页面

| 地址 | 内容来源 |
|---|---|
| `/` | `src/pages/index.astro`：首屏 + 四张项目封面 |
| `/fydeos/` `/zhong-da-yuan/` `/merryking/` `/soundlinks/` | `src/pages/[project].astro`，内容在 `src/content/projects/<id>.mdx` |

地址取自内容文件名，改文件名就改地址。输出 `dist/<id>/index.html`，站内链接带尾部斜杠。新增项目要改两处：新建 `.mdx`，在 `ProjectMosaic.astro` 里加一张卡和它的封面组件。

## 命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 先裁字体，再启动开发服务（带 `--host`，局域网能访问） |
| `pnpm build` | 先裁字体，再构建到 `dist/` |
| `pnpm preview` | 预览 `dist/` |
| `pnpm check` | 先裁字体，再跑 `astro check` |
| `pnpm fonts` | 只重新裁字体 |
| `pnpm format` / `pnpm format:check` | 用 Prettier 整理 / 检查全部文件 |

## 目录

```
site/
├── astro.config.mjs        # site、MDX、Markdown 处理器（外链新标签页）、代码高亮主题、字体文件不内联
├── pnpm-workspace.yaml     # 放行 esbuild 的安装脚本
├── .prettierrc / .prettierignore
├── scripts/build-fonts.mjs # 字体裁剪
├── public/favicon.svg      # 黄色旋转方块
├── docs/
└── src/
    ├── content.config.ts   # projects 集合的字段
    ├── content/projects/   # 四篇 MDX：frontmatter + 正文
    ├── pages/              # index.astro、[project].astro
    ├── layouts/Base.astro  # head、顶栏、<main class="shell">、页脚
    ├── styles/             # global.css（token、版心）、article.css（正文）、fonts.generated.css（生成物）
    ├── scripts/            # field.ts（首屏方块）、hub-flow.ts（Merryking 动画）
    ├── components/
    │   ├── SiteHeader · Footer · Hero · ProjectMosaic · BrowserMock
    │   ├── covers/         # Fydeos · Zhongdayuan · Merryking · Soundlinks，首页卡片封面
    │   ├── ProjectIntro · MetricGroup · NextProject · Tag                   # 详情页骨架
    │   ├── Figure · LoopVideo                                               # 正文插图、静音循环视频
    │   └── diagrams/       # Flow · FifoBars · Refactor，正文里的示意图（HTML，不是 SVG 文件）
    └── assets/
        ├── projects/<id>/  # fydeos · merryking · soundlinks · zhongdayuan，封面和正文用图、图标都按项目放
        └── fonts/          # 生成物，不进 git
```

## 约定

**命名与文案**
- 全站不出现中文全名。首页网页标题 `Wang Yudong`，描述 `全栈工程师`。详情页标题 `项目名 · 副标题 — Wang Yudong`，og:title 不带后半段。
- 文案以 `src/content/projects/*.mdx` 和 `Hero.astro` 为准，会持续改，文档里不重复。写法：短句、不用营销形容词、数字前置、第一人称不出现姓名、承认代价。
- 数字不加千分位逗号：写 1301，不写 1,301。
- 中达源只说案件管理与资金分析，不提客户行业。

**隐私**
- 不出现真实案件数据。中达源截图全部是模拟数据：账号是 `9999` 开头的假号，公司名和人名都是编的。
- 阿里工具链只画流程，不放飞书、WhatsApp、阿里后台的任何截图。不复制任何密钥。

**视觉**
- 字重只用 400 / 600。
- 不给文字加马克笔高亮。黄色用在品牌方块、按钮 hover、强调块和链接下划线上。
- 按钮和项目卡片里的文字不可选中。

## 版心与 token

断点 810 / 1200 / 1440。版心按断点跳档，固定宽度居中，数值来自参照站 bradleyziffer.com 的实测：

| 视口 | 版心 | 拼贴宽列 / 窄列 | 列间距 |
|---|---|---|---|
| ≥1440 | 1248 | 825 / 399 | 24 |
| 1200–1439 | 1008 | 675 / 323 | 10 |
| 810–1199 | 714 | 476 / 228 | 10 |
| <810 | 视口宽 − 32 | 单列 | 10 |

- 顶栏、首屏、项目区、详情页、页脚都对齐 `.shell`。拼贴列宽写成 `fr`（如 `476fr 228fr`），不写死像素。
- 顶栏高度是 CSS 变量 `--header-h`：116px，手机 86px。
- token 在 `global.css` 的 `@theme static` 里：底色 `#fafaf8`、墨色 `#20221f`、次要文字 `#62665e`、线色 `#dedfd8`、黄色 `#ffe14d`、焦点环 `#746000`。正文用 `#555a52`。次要文字在底色上约 5.6:1，正文更深，都过 AA。

## 首页

**顶栏** `SiteHeader`
- 左边是黄色方块标，链回首页，没有文字；favicon 是同一个方块。
- 右边按钮 `打个招呼👋`，链到 `mailto:hi@wyudong.com`，hover 变黄，手机端隐藏 emoji。👋 两套字体里都没有，用系统 emoji 字体显示。

**首屏** `Hero` + `scripts/field.ts`
- 左：h1、描述、按钮 `看看我的作品`（链到 `#projects`，不带箭头）。右：方块 canvas，右下角一行提示 `试着动一动`，手机端居中。没有问候行。
- h1 字号跟版心跳档：60 / 52 / 42px，手机 `clamp(30px, 7.8vw, 54px)`。
- 方块：种子 1907、黄块 9×9、灰块让到外圈、整理半径 2.35。鼠标经过或点击会整理附近的黄块，停止操作 1.5 秒后约 1 秒打散；Enter / 空格整理下一片。
- 动画一直运行，只在页面不可见或滚出视口时暂停。开启减弱动效后直接归位。缩放窗口不重置状态；aria-live 播报；noscript 显示静态图。没有暂停和重新打散按钮。

**项目拼贴** `ProjectMosaic`
- 区块头：黄色旋转小方块 + `做过的项目`。
- 两列：左 FydeOS、中达源，右 Merryking、Soundlinks。FydeOS `16/9`、中达源 `1.39189`、Merryking `1/0.96` 固定宽高比；Soundlinks 不设比例，用 `flex: 1` 撑满窄列，两列自然齐底。
- 手机单列，按 DOM 顺序排，不用 `order`。比例：FydeOS `1/0.82`、中达源 `1.39189`、Merryking `1/0.96`、Soundlinks `1/1.4`。
- **整卡链接**：每张卡里有一个铺满的透明链接，无障碍名称是 `项目名：副标题`。封面层叠在链接上面，但不接收指针，点击会穿到链接；封面里的按钮单独接收。不用 `<a>` 包住整张卡，因为 Merryking 封面里有按钮，交互元素不能嵌套。
- **hover 和键盘聚焦**：只缩小封面层（0.95）并盖一层浅色，外层不动，鼠标停在卡片边缘不会抖。焦点环画在外层，不会被封面的 `overflow: hidden` 裁掉。

**封面**（`components/covers/`）

每个封面根节点是 `position: absolute; inset: 0`，要放在有尺寸的定位容器里。截图走 astro:assets 的 `<Image>`，图片都是 `loading="lazy"`；中达源和 Soundlinks 的 `sizes` 按四档列宽写，FyDrop 窗口小，单独写。FydeOS 应用卡的三个 SVG 用普通 `<img>`，Merryking 图标是 SVG 组件。

| 封面 | 内容 |
|---|---|
| FydeOS | 蓝紫渐变底，三个 BrowserMock 窗口，各占封面宽 35%。左边 Community 左倾 5°，画成论坛版块列表（新闻公告、求助答疑、分享发现，各带一句说明）。中间 App Store 压在最上层，三张应用卡是三个独立 SVG，卡片标题用真文字。右边 FyDrop 右倾 5°，是真实界面截图。<1200 时收起应用卡标题、版块说明和导航 |
| 中达源 | 淡红渐变底，一个 BrowserMock 窗口，宽 91%、比例 1.448，四周留白相同；截图从左上角铺满窗口 |
| Merryking | 点阵底加黄色光晕。中心节点"自动化工具"连出四个节点：电商独立站、Google Ads、飞书机器人、阿里国际站。节点是横向胶囊（图标在左、文字在右），尺寸随容器宽度缩放；中心节点黄底、600，其余 400。底部居中有暂停按钮 |
| Soundlinks | 一张 App 截图（听一听），铺满卡片、顶部对齐，不参与撑高 |

**Merryking 信号动画** `scripts/hub-flow.ts`
- 用 SVG 加 Web Animations API，按样稿 `merryking-flow-v2.js` 的时间轴重写，不用 Lottie，零依赖。
- 30fps、120 帧（4 秒）一个循环：两个输入点从网站到中心（第 6–33、14–41 帧），中心脉冲圈（34–53），三个输出点从中心到飞书（49–78）、Google Ads（53–82）、阿里国际站（57–86）。
- 离开视口、标签页隐藏、开启减弱动效、点暂停按钮时停止。按钮 `z-index: 6`，盖在整卡链接上面。

**Merryking 图标**：经 Iconify 获取，文件头注明来源和许可。

| 节点 | 图标 | 许可 |
|---|---|---|
| 自动化工具 | Tabler `bolt` | MIT |
| 电商独立站 | Tabler `world-www` | MIT |
| Google Ads | Simple Icons `googleads` | CC0 |
| 飞书机器人 | IconPark `new-lark` | Apache-2.0 |
| 阿里国际站 | Simple Icons `alibabadotcom` | CC0 |

**页脚** `Footer`：上边一条线。左边 `© 2026 wyudong.com`，右边 `github ↗`，链到 https://github.com/wyudong，新标签页打开。12px 次要文字色，链接 hover 变深。

## 详情页

从上到下：

```
顶栏
① 标题区     ProjectIntro   项目名 · 副标题 · 导语 ｜ 时间 / 角色 / 技术栈
② 关键数字   MetricGroup    3–4 个大数字，上边一条线
③ 正文       MDX            项目背景 / 我做了什么 / 技术细节 / 结果与回顾，图文交替
④ 下一个项目 NextProject    ← 全部项目 ｜ 下一个项目：xxx →
页脚
```

全部在 `<main class="shell">` 里，没有通栏元素。曾经有过放大封面的通栏 banner，已经连同组件和封面里的 banner 代码一起删掉。

**① 标题区** `ProjectIntro`
- 上边距 56 / 48 / 40 / 32px（四档）。
- ≥1200 两栏 `1fr 350px`，间距 48，右栏是元信息；<1200 单列，元信息在导语下面。
- h1 600，52 / 44 / 36 / `clamp(28px, 7vw, 40px)`。副标题 20 / 18 / 17 / 16，色 `#555a52`。导语 16px / 1.95，`max-width: 36em`。
- 元信息用固定网格：时间、角色各占一格，技术栈单独一行；≥1200 三项竖排。标签 13px 次要色，值 15px。
- 技术栈是一排 `Tag`：1px 线色胶囊，13px（手机 12px），名字整体不断行。固定网格加不断行的标签，让网页字体加载前后换行位置不变，避免下面的内容跳动。

**② 关键数字** `MetricGroup`
- 只有上边框，和正文之间靠留白分开。上边距 56 / 48 / 48 / 40，上下内边距 40（手机 32）。
- 数字 50 / 48 / 40 / 36px，400，`tabular-nums`，不断行。数字后面可以跟小号单位 `unit`（数字的 0.4 倍，400）。说明 16px 次要色。
- ≥1200 一行排完（最多 4 项），更窄时两列。

**③ 正文** `styles/article.css`
- 16px / 1.95（手机 1.9），色 `#555a52`。段落、标题、列表限宽 36em（约 36 个汉字），插图占满版心。
- h2：黄色小方块 + 20px / 600（手机 18），上边距 72（手机 56）。h3 16px / 600。
- 列表 marker 浅灰；加粗是 600 + 墨色。链接带 3px 黄色下划线，hover 浅黄底。正文里指向外站的链接在新标签页打开，由 `astro.config.mjs` 里的 satteri 插件加上 `target="_blank" rel="noopener"`。
- 代码块用 Shiki 的 `github-light`，底色统一成 `#efefe9`，12px 圆角，等宽字体走系统栈，不加字体文件。
- 两张并排放在 `<div class="pair">` 里，≥810 两列，间距 24。
- `article.css` 只由 `[project].astro` 引入，不放进 `@layer`：站点没有 preflight，要显式盖掉浏览器默认边距（比如 `figure` 左右 40px），也要能压过组件的 scoped 样式。

**④ 下一个项目** `NextProject`
- 上边一条线。左边 `← 全部项目`，链到 `/#projects`。右边是标签"下一个项目"、32px / 600 的项目名（手机 24）和时间，hover 时箭头右移 4px。手机端上下排，下一个项目在上。
- 顺序按 `order` 循环：FydeOS → 中达源 → Merryking → Soundlinks → FydeOS，可以用 frontmatter 的 `next` 覆盖。

**正文组件**

| 组件 | 作用 |
|---|---|
| `Figure` | 属性 `src`、`alt`、`caption`、`frame`、`half`。给 `src` 渲染图片，默认带 1px 线色边框、14px 圆角（手机 10）；给 `frame` 就套浏览器窗口框，值是标题栏文字；`half` 只影响两张并排时的 `sizes`。不给 `src` 就渲染插槽，放示意图或视频。上下边距 48（手机 36），图注 13px 次要色 |
| `LoopVideo` | 静音循环视频，代替 GIF（GIF 过 `<Image>` 会被压成单帧）。有封面图，`preload="none"`，滚进视口才播放、滚出暂停，开启减弱动效默认不播放，右下角有播放 / 暂停按钮。1px 线色边框、14px 圆角 |
| `diagrams/Flow` | 一排步骤卡片，中间箭头，`accent` 步骤黄底。容器 <700 竖排；5 步及以上 <960 就竖排 |
| `diagrams/FifoBars` | 先进先出匹配示意，金额和日期是虚构的 |
| `diagrams/Refactor` | FydeOS 后端重构。左边重构前：账号服务、同步服务（Node.js）和企业管理后端各自对外。右边黄底框：APISIX 网关 → gRPC → 三个服务（账号、同步用 Go 重写）。容器 <640 竖排 |
| `BrowserMock` | 带标题栏的窗口框，本身是名为 `mock` 的容器。边框、阴影、圆角、标题栏高度、字号、内边距、间距都是带默认值的 CSS 变量 |
| `Tag` | 胶囊标签，现在只用在技术栈 |

示意图都是 HTML 组件，文字跟随页面字体，窄屏自动竖排，用 `role="img"` 加 `aria-label` 给读屏软件。

**各页插图**

| 项目 | 正文插图 |
|---|---|
| FydeOS | 应用商店截图；FyDrop 演示视频和社区论坛截图并排，两边等高；`Refactor` |
| 中达源 | `Flow`（导入 → 清洗 → 穿透 → 导出）；资金树、资金流向图两张截图；`FifoBars` |
| Merryking | `Flow`（Google Ads 转化优化链路，五步） |
| Soundlinks | `Flow`（编码 → 播放 → 采集 → 解码） |

## 写内容

- 正文是 Markdown，插图和示意图用 `<Figure>` 包起来。MDX 文件顶部是 import，其余照常写。
- 改完文字后跑一次 `pnpm fonts`，新出现的字才会进字体子集。`pnpm dev` 只在启动时裁一次。新增内容文件或改了集合字段后，重启 `pnpm dev`。
- MDX 文件不会被 Prettier 格式化，见"格式化"。
- frontmatter 字段（`src/content.config.ts`）：

| 字段 | 说明 |
|---|---|
| `title`、`subtitle` | 项目名、副标题 |
| `period`、`role` | 时间、角色 |
| `stack` | 技术栈，字符串数组，至少一项 |
| `summary` | 导语，同时是缺省的 meta description |
| `ogDescription` | 可选，不超过 160 字 |
| `metrics` | 3 到 4 项，每项 `value`、`label`，可选 `unit` |
| `order` | 排序，也决定"下一个项目" |
| `next` | 可选，引用另一个项目，覆盖缺省的下一个 |

## 素材

全部放在 `src/assets/projects/<id>/`。

| 文件 | 尺寸 | 用在 | 说明 |
|---|---|---|---|
| `fydeos/store.png` | 2548×1356 | 正文 | 应用商店首页 |
| `fydeos/community.png` | 2794×1506 | 正文 | 社区话题列表，裁成和视频一样的比例（720:388），并排时两边等高 |
| `fydeos/drop.mp4`、`drop-cover.jpg` | 720×388 | 正文 | FyDrop 演示视频和封面图，由老站的 GIF 用 ffmpeg 转出 |
| `fydeos/fydrop.png` | 1202×1554 | 封面 | FyDrop 真实界面 |
| `fydeos/installer.svg`、`opengapps.svg`、`rdp.svg` | | 封面 | 应用商店窗口里的三张应用卡 |
| `merryking/*.svg` | | 封面 | 五个节点图标，见上 |
| `soundlinks/soundlinks-listen.png` | 1242×2208 | 封面 | App Store 截图（听一听） |
| `zhongdayuan/trace-tree.png` | 2700×1800 | 正文 | 资金树，模拟数据 |
| `zhongdayuan/trace-flow.png` | 2700×1800 | 正文、封面 | 资金流向图，模拟数据，正文和首页封面共用 |

- FydeOS 的 store、community、drop 三个站点正文里都链了。

## 字体

- 英文字母、数字和英文标点用 Plus Jakarta Sans，中文和其余字符用 Noto Sans SC。两套都只用 400 和 600 两种字重。
- `scripts/build-fonts.mjs` 按全站实际用到的字符裁剪字体（扫描 `src` 下的 `.astro`、`.md(x)`、`.ts`、`.css`，补上 Markdown 渲染时生成的排版标点），每套只输出一个文件到 `src/assets/fonts/`，同时生成 `src/styles/fonts.generated.css`。两者都是生成物，已在 `.gitignore` 里。
- 源字体是 Google Fonts 仓库里完整的可变字体，固定到某次提交并校验 sha256。第一次运行时下载（Noto Sans SC 约 17 MB），缓存在 `node_modules/.cache/fonts/`，之后不再联网。要换字体版本，改脚本里的地址和校验值。Fontsource 的包只有按 unicode-range 切好的分片，没法合成一个文件，所以不用。
- `src/layouts/Base.astro` 在 `<head>` 里预加载这两个文件。打开任何一页都会马上下载全站字体，换页直接用缓存。`astro.config.mjs` 让 `.woff2` 不内联成 base64，否则会塞进每页的 CSS、挡住首屏渲染。
- 空格、「·」「—」、中文引号、省略号留给 Noto Sans SC，不交给英文字体。这样全站行高不变，分隔点也保持原来的样子。
- 代码块的等宽字体走系统栈，不进字体子集。

| 文件 | 大小 |
|---|---|
| `plus-jakarta-sans.woff2` | 16 KB |
| `noto-sans-sc.woff2` | 206 KB |

每个页面都只下载这两个文件，共约 222 KB。之前按页面拆分时，首页是 16 个文件 109 KB，详情页是 34 到 39 个文件 183 到 191 KB。

## 技术取舍

1. **版本**：Astro 7.3.2、Tailwind 4.3、TypeScript 6。`@astrojs/check` 只接受 TS 5 或 6。Node 要求 ≥22.12（本机 22.20）。pnpm 11 默认不跑依赖的安装脚本，`pnpm-workspace.yaml` 里放行了 esbuild。图片处理需要 sharp，已在依赖里。
2. **Tailwind 只引入 theme 和 utilities 两层，不引入 preflight**：样稿很多地方没写行高，依赖浏览器默认的 `normal`，preflight 会统一改成 1.5，按钮和标题的高度都会变。没有 preflight，所以正文要自己写一套重置（`article.css`）。组件样式都在 scoped `<style>` 里，scoped 样式会盖过 utility，同一个属性只用一种写法。
3. **Markdown 处理器**是 `@astrojs/markdown-satteri`，MDX 默认继承它，外链新标签页的插件挂在它上面。
4. **视觉来源**：定稿样稿是 `~/Desktop/résumé/homedesign-v2/项目封面构图样稿.zip`，按批注改过。样稿里的 650、550、500 字重都换算成 600。断点用 810 / 1200 / 1440，替代样稿的 760 / 1050 / 1600；版心不随视口连续变化，改成参照站的跳档。首屏行为以样稿代码为准，`directions.html` 里的"2 秒 / 6 秒"是旧描述。
5. **head**：title、description、canonical、theme-color、favicon，og:title、description、type、url、locale。没有 og:image。

## 格式化

- 规则：单引号、2 格缩进、一行最长 120 列，`.astro` 用 `prettier-plugin-astro`。
- `.prettierignore` 跳过 `*.mdx`（Prettier 的 MDX 解析不认正文里的 `{/* */}` 注释和 frontmatter 里的内联对象）、`docs`、锁文件和 `favicon.svg`。`dist`、`.astro`、字体生成物已经在 `.gitignore` 里，Prettier 默认跳过。
- Zed 保存时会按这个配置自动格式化。Zed 在这个项目里不会自己重新加载 `.prettierrc`，改了配置要完全退出 Zed（Cmd+Q）再打开，否则它还用旧配置。
- 不想让 Zed 自动整理 Astro 文件，就在 Zed 设置里给 Astro 关掉 `format_on_save`。

## 验证

**当前状态（2026-10-05）**
- `pnpm build` 通过，五个页面。
- `pnpm check` 0 错误。外链插件的类型来自 `satteri`，它要作为开发依赖直接装进项目，否则找不到类型声明。
- 删掉 banner、换掉截图之后，下面的尺寸、交互和 Lighthouse 还没有重测。
- 隐私：构建产物的文字里没有中文全名，没有 12 位以上的数字串，唯一的邮箱是 `hi@wyudong.com`。截图里的 `9999…` 是假账号。

**上次完整验证（2026-10-04）**

`pnpm check` 0 错误，`pnpm format:check` 通过，五个页面都没有横向滚动。

首页拼贴尺寸（脚本读盒子，和参照站实测一致）：

| 视口 | FydeOS | 中达源 | Merryking | Soundlinks |
|---|---|---|---|---|
| 1440（及更宽） | 825×464 | 825×593 | 399×383 | 399×674 |
| 1280 | 675×380 | 675×485 | 323×310 | 323×555 |
| 1024 | 476×268 | 476×342 | 228×219 | 228×391 |
| 390 | 358×294 | 358×257 | 358×344 | 358×501 |

交互：
- Tab 能依次聚焦四张卡，焦点环在卡片外可见，Enter 进详情页。Merryking 暂停按钮在卡片上能点。skip link 落到 `#main`。
- 开启减弱动效后，首屏方块直接归位，Merryking 动画停止，视频默认不播放。
- 视频滚进视口自动播放，滚出自动暂停，没进视口时不下载。
- 模拟字体晚到时，布局几乎不跳动。

| Lighthouse | 性能 | 可访问性 | 最佳实践 | SEO |
|---|---|---|---|---|
| 首页 · 手机 | 97 | 100 | 100 | 100 |
| FydeOS · 手机 | 97 | 100 | 100 | 100 |
| 中达源 · 手机 | 98 | 100 | 100 | 100 |
| Merryking · 手机 | 99 | 100 | 100 | 100 |
| Soundlinks · 手机 | 97 | 100 | 100 | 100 |
| 首页 · 桌面 | 100 | 100 | 100 | 100 |
| FydeOS · 桌面 | 100 | 100 | 100 | 100 |

累计布局偏移 0.001，没有外部请求。
