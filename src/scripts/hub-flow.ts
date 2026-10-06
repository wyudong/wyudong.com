// Merryking 封面的信号动画：两个请求从网站进入自动化工具，处理后分别送往飞书、Google Ads 和阿里国际站。
// 时间轴按 30fps 计，120 帧（4 秒）一个循环，用 Web Animations API 实现，不依赖 Lottie。

type Point = [number, number];

const FRAMES = 120;
const DURATION = (FRAMES / 30) * 1000;
const EASE = 'cubic-bezier(.42,0,.58,1)';
const TIMING: KeyframeAnimationOptions = { duration: DURATION, iterations: Infinity };

// 与连线同一个 300×280 坐标系。外圈四点是节点朝内一侧边缘的中点（节点中心上下各偏 10），
// 这样连线落在胶囊边的中间，不会斜着扎到胶囊角上。
const WEB: Point = [55, 45];
const ADS: Point = [245, 45];
const HUB: Point = [150, 140];
const FEISHU: Point = [55, 235];
const ALIBABA: Point = [245, 235];

const at = (frame: number) => frame / FRAMES;
const translate = ([x, y]: Point) => `translate(${x}px, ${y}px)`;

function travel(el: SVGElement, from: Point, to: Point, start: number, end: number): Animation[] {
  return [
    el.animate(
      [
        { offset: 0, transform: translate(from) },
        { offset: at(start), transform: translate(from), easing: EASE },
        { offset: at(end), transform: translate(to) },
        { offset: 1, transform: translate(to) },
      ],
      TIMING,
    ),
    el.animate(
      [
        { offset: 0, opacity: 0 },
        { offset: at(start), opacity: 0, easing: EASE },
        { offset: at(start + 3), opacity: 1, easing: EASE },
        { offset: at(end - 3), opacity: 1, easing: EASE },
        { offset: at(end), opacity: 0 },
        { offset: 1, opacity: 0 },
      ],
      TIMING,
    ),
  ];
}

function pulse(el: SVGElement): Animation[] {
  const scaled = (s: number) => `${translate(HUB)} scale(${s})`;
  return [
    el.animate(
      [
        { offset: 0, transform: scaled(0.55) },
        { offset: at(34), transform: scaled(0.55), easing: EASE },
        { offset: at(53), transform: scaled(2.6) },
        { offset: 1, transform: scaled(2.6) },
      ],
      TIMING,
    ),
    el.animate(
      [
        { offset: 0, opacity: 0 },
        { offset: at(34), opacity: 0, easing: EASE },
        { offset: at(39), opacity: 0.55, easing: EASE },
        { offset: at(53), opacity: 0 },
        { offset: 1, opacity: 0 },
      ],
      TIMING,
    ),
  ];
}

export function initHubFlow(root: HTMLElement): void {
  const svg = root.querySelector<SVGSVGElement>('.hub-signals');
  const button = root.querySelector<HTMLButtonElement>('.cover-motion');
  if (!svg || !button || typeof svg.animate !== 'function') return;
  const signal = (name: string) => svg.querySelector<SVGElement>(`[data-signal="${name}"]`);
  const ring = signal('pulse');
  const in1 = signal('in-1');
  const in2 = signal('in-2');
  const toFeishu = signal('out-feishu');
  const toAds = signal('out-ads');
  const toAlibaba = signal('out-alibaba');
  if (!ring || !in1 || !in2 || !toFeishu || !toAds || !toAlibaba) return;

  const animations = [
    ...pulse(ring),
    ...travel(in1, WEB, HUB, 6, 33),
    ...travel(in2, WEB, HUB, 14, 41),
    ...travel(toFeishu, HUB, FEISHU, 49, 78),
    ...travel(toAds, HUB, ADS, 53, 82),
    ...travel(toAlibaba, HUB, ALIBABA, 57, 86),
  ];
  for (const animation of animations) animation.pause();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduce.matches;
  let visible = false;

  const sync = () => {
    button.setAttribute('aria-pressed', String(paused));
    // 文案按页面语言写在 Merryking.astro 按钮的 data-label-* 上
    button.setAttribute('aria-label', (paused ? button.dataset.labelPlay : button.dataset.labelPause) ?? '');
    const running = visible && !paused && !document.hidden;
    for (const animation of animations) {
      if (running) animation.play();
      else animation.pause();
    }
  };

  button.hidden = false;
  button.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  reduce.addEventListener('change', (event) => {
    paused = event.matches;
    sync();
  });
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    sync();
  }).observe(root);
  document.addEventListener('visibilitychange', sync);
  sync();
}
