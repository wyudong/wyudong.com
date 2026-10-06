// 中文首页标题随滚动换句：两句叠在同一格里，往下滚第一句淡出、第二句淡入，往回滚倒过来。
// 页面只写进度 --p（0–1），每句怎么变在 Hero.astro 的样式里。
// 进度不直接跟滚动条走，每帧向目标靠近一段（类似 GSAP ScrollTrigger 的 scrub），滚轮一格一格跳时也是平滑的。
// 开启减弱动效时不做平滑，进度直接跟滚动走。

/** 平滑的时间常数，越大跟得越慢 */
const TAU = 0.18;

export function initScrollTitle(title: HTMLElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let start = 0;
  let range = 1;
  let current = 0;
  let target = 0;
  let last = 0;
  let frame = 0;

  // 从页面顶部开始，滚到标题快要顶到窗口上沿时换完
  const measure = () => {
    const top = title.getBoundingClientRect().top + scrollY;
    range = Math.max(120, Math.min(top - innerHeight * 0.12, 320));
  };

  const read = () => Math.min(Math.max((scrollY - start) / range, 0), 1);

  const paint = () => title.style.setProperty('--p', current.toFixed(4));

  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    current += (target - current) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(target - current) < 0.001) current = target;
    paint();
    frame = current === target ? 0 : requestAnimationFrame(tick);
  };

  const update = () => {
    target = read();
    if (reduce.matches) {
      current = target;
      paint();
      return;
    }
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  measure();
  // 刷新时停在页面中间，直接显示对应状态，不从头播
  current = target = read();
  paint();

  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', () => {
    measure();
    update();
  });
}
