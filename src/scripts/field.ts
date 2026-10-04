// 首屏"理一理"方块，从样稿移植，算法与常量保持不变。
// 每个黄块在同一张隐藏网格上有固定地址；指针经过时附近的黄块归位、灰块让到外圈，
// 停止操作 1.5 秒后慢慢打散。

interface Piece {
  yellow: boolean;
  x: number;
  y: number;
  angle: number;
  /** 当前这段动画的起点 */
  sx: number;
  sy: number;
  sa: number;
  /** 最初打散时的位置，打散动画回到它附近 */
  ox: number;
  oy: number;
  oa: number;
  /** 归位目标 */
  tx: number;
  ty: number;
  /** 打散目标和弯曲程度 */
  dx: number;
  dy: number;
  da: number;
  bend: number;
  opacity: number;
  locked: boolean;
  settled: boolean;
  start: number;
  phase: number;
  size: number;
  color: string;
}

interface Pulse {
  x: number;
  y: number;
  start: number;
}

type Vec = [number, number];

const IDLE_BEFORE_DISPERSE = 1.5;

const ease = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 4);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function queryParts(root: HTMLElement) {
  const canvas = root.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!canvas || !ctx || !status) return null;
  return { canvas, ctx, status };
}

export function initField(root: HTMLElement): void {
  const parts = queryParts(root);
  if (!parts) return;
  const { canvas, ctx, status } = parts;

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = preference.matches;
  let visible = true;
  let frame = 0;
  let previous = 0;
  let width = 0;
  let height = 0;
  let spacing = 0;
  let time = 0;
  let points: Piece[] = [];
  let pulses: Pulse[] = [];
  let seed = 1907;
  let lastInput = 0;
  let dispersing = false;
  let disperseStart = 0;

  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function project(x: number, y: number): Vec {
    return [width * 0.5 + x * spacing, height * 0.48 + y * spacing];
  }

  function rimTarget(edge: number, offset: number, rim: number): Vec {
    if (edge === 0) return [offset, -rim];
    if (edge === 1) return [rim, offset];
    if (edge === 2) return [offset, rim];
    return [-rim, offset];
  }

  function scatter() {
    seed += 37;
    points = [];
    pulses = [];
    dispersing = false;
    lastInput = time;
    const targets: Vec[] = [];
    for (let row = -4; row <= 4; row++) for (let col = -4; col <= 4; col++) targets.push([col, row]);
    const slots: Vec[] = [];
    for (let row = -5; row <= 5; row++) {
      for (let col = -5; col <= 5; col++) {
        slots.push([col * 1.04 + (random() - 0.5) * 0.58, row * 1.04 + (random() - 0.5) * 0.58]);
      }
    }
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    // 就近配对，让每一笔整理都只影响附近的方块。
    const pairs: { i: number; j: number; d: number }[] = [];
    for (let i = 0; i < targets.length; i++) {
      for (let j = 0; j < targets.length; j++) {
        pairs.push({
          i,
          j,
          d: Math.hypot(slots[i][0] - targets[j][0], slots[i][1] - targets[j][1]),
        });
      }
    }
    pairs.sort((a, b) => a.d - b.d);
    const assigned = new Map<number, Vec>();
    const used = new Set<number>();
    for (const pair of pairs) {
      if (!assigned.has(pair.i) && !used.has(pair.j)) {
        assigned.set(pair.i, targets[pair.j]);
        used.add(pair.j);
      }
    }
    for (let i = 0; i < slots.length; i++) {
      const yellow = i < targets.length;
      const [x, y] = slots[i];
      const angle = (random() - 0.5) * 1.45;
      // 灰块最终让到黄色方阵外圈。random() 的调用顺序与样稿一致，保证同一种子排布相同。
      const edge = (i - targets.length) % 4;
      const offset = (random() - 0.5) * 10.4;
      const rim = 5.05 + random() * 0.85;
      const [tx, ty] = yellow ? (assigned.get(i) as Vec) : rimTarget(edge, offset, rim);
      const phase = random() * 6.28;
      const size = yellow ? 0.78 : 0.5 + random() * 0.23;
      points.push({
        yellow,
        x,
        y,
        angle,
        sx: x,
        sy: y,
        sa: angle,
        ox: x,
        oy: y,
        oa: angle,
        tx,
        ty,
        dx: x,
        dy: y,
        da: angle,
        bend: 0,
        opacity: 1,
        locked: false,
        settled: false,
        start: 0,
        phase,
        size,
        color: yellow ? '#ffe14d' : i % 3 === 0 ? '#454a43' : '#bfc3b9',
      });
    }
    status.textContent = '已重新打散。移动鼠标或点击，整理附近的黄色方块。';
    render(0);
    start();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    spacing = Math.min(width, height) / 14.8;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 坐标以网格为单位，缩放窗口不会清掉已经整理好的部分。
    render(0);
    start();
  }

  function lock(p: Piece, delay: number) {
    if (!p.yellow) {
      const edge = Math.floor(random() * 4);
      const offset = (random() - 0.5) * 10.4;
      const rim = 5.05 + random() * 0.85;
      [p.tx, p.ty] = rimTarget(edge, offset, rim);
    }
    p.locked = true;
    p.settled = false;
    p.sx = p.x;
    p.sy = p.y;
    p.sa = p.angle;
    p.start = time + delay;
    if (paused) {
      p.x = p.tx;
      p.y = p.ty;
      p.angle = 0;
      p.settled = true;
    }
  }

  function activity() {
    lastInput = time;
    if (!dispersing) return;
    dispersing = false;
    // 从当前位置接着整理，而不是跳回最初的散落状态。
    for (const p of points) {
      p.sx = p.x - Math.sin(time * 0.5 + p.phase) * 0.085;
      p.sy = p.y - Math.cos(time * 0.42 + p.phase) * 0.085;
      p.sa = p.angle;
    }
  }

  function beginDispersal() {
    dispersing = true;
    disperseStart = time;
    pulses = [];
    for (const p of points) {
      p.sx = p.x;
      p.sy = p.y;
      p.sa = p.angle;
      p.dx = p.ox + (random() - 0.5) * 0.4;
      p.dy = p.oy + (random() - 0.5) * 0.4;
      p.da = p.oa + (random() - 0.5) * 0.4;
      p.bend = (random() - 0.5) * 0.5;
      p.locked = false;
      p.settled = false;
    }
  }

  function organize(px: number, py: number) {
    activity();
    const x = (px - width * 0.5) / spacing;
    const y = (py - height * 0.48) / spacing;
    const radius = 2.35;
    const chosen = points.filter(
      (p) =>
        p.yellow &&
        !p.locked &&
        (Math.hypot(p.x - x, p.y - y) < radius || Math.hypot(p.tx - x, p.ty - y) < radius * 0.72),
    );
    if (!chosen.length) return;
    chosen.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    chosen.forEach((p, i) => lock(p, Math.min(i * 0.024, 0.35)));
    for (const p of points) {
      if (
        !p.yellow &&
        !p.locked &&
        (Math.hypot(p.x - x, p.y - y) < radius || chosen.some((q) => Math.hypot(p.x - q.tx, p.y - q.ty) < 1.25))
      ) {
        lock(p, 0.04);
      }
    }
    if (!paused) pulses.push({ x, y, start: time });
    if (pulses.length > 5) pulses.shift();
    const remaining = points.some((p) => p.yellow && !p.locked);
    status.textContent = remaining ? '这一片已经理清楚了。可以继续整理其他位置。' : '黄色方块已全部整理完成。';
    render(0);
    start();
  }

  function render(dt: number) {
    if (!width || !height) return;
    if (!paused) {
      time += dt;
      if (!dispersing && time - lastInput >= IDLE_BEFORE_DISPERSE && points.some((p) => p.locked)) {
        beginDispersal();
      }
    }
    ctx.clearRect(0, 0, width, height);
    // 淡淡的定位点暗示一个潜在的结构，而不是棋盘。
    ctx.fillStyle = '#d8dbd2';
    for (let row = -4; row <= 4; row++) {
      for (let col = -4; col <= 4; col++) {
        const [x, y] = project(col, row);
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 先画灰块，逐渐成形的黄色结构始终在上层。
    for (const p of [...points.filter((q) => !q.yellow), ...points.filter((q) => q.yellow)]) {
      if (dispersing && !paused) {
        const progress = (time - disperseStart) / (p.yellow ? 0.95 : 1.15);
        const t = ease((progress - 0.08) / 0.92);
        const curve = Math.sin(Math.PI * t) * p.bend;
        p.x = mix(p.sx, p.dx, t) - (p.dy - p.sy) * curve;
        p.y = mix(p.sy, p.dy, t) + (p.dx - p.sx) * curve;
        p.angle = mix(p.sa, p.da, ease(progress * 1.8));
      } else if (p.locked && !p.settled && !paused) {
        const progress = (time - p.start) / (p.yellow ? 0.95 : 1.15);
        p.angle = mix(p.sa, 0, ease(progress * 1.8));
        const t = ease((progress - 0.08) / 0.92);
        p.x = mix(p.sx, p.tx, t);
        p.y = mix(p.sy, p.ty, t);
        if (progress >= 1) {
          p.x = p.tx;
          p.y = p.ty;
          p.angle = 0;
          p.settled = true;
        }
      } else if (!p.locked && !paused) {
        p.x = p.sx + Math.sin(time * 0.5 + p.phase) * 0.085;
        p.y = p.sy + Math.cos(time * 0.42 + p.phase) * 0.085;
      }
      const [x, y] = project(p.x, p.y);
      const size = p.size * spacing;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.angle);
      const targetOpacity = !p.yellow && p.locked ? 0.62 : 1;
      p.opacity = paused ? targetOpacity : mix(p.opacity, targetOpacity, 1 - Math.exp(-dt * 4));
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.15);
      ctx.fill();
      ctx.restore();
    }
    if (dispersing && time - disperseStart >= 1.15) {
      dispersing = false;
      for (const p of points) {
        p.sx = p.x - Math.sin(time * 0.5 + p.phase) * 0.085;
        p.sy = p.y - Math.cos(time * 0.42 + p.phase) * 0.085;
        p.sa = p.angle;
      }
    }
    pulses = pulses.filter((p) => time - p.start < 0.65);
    for (const p of pulses) {
      const age = (time - p.start) / 0.65;
      const [x, y] = project(p.x, p.y);
      ctx.beginPath();
      ctx.arc(x, y, (0.55 + age * 1.8) * spacing, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(151,126,28,${0.16 * (1 - age)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function tick(timestamp: number) {
    frame = 0;
    const dt = previous ? (timestamp - previous) / 1000 : 1 / 60;
    previous = timestamp;
    render(dt);
    start();
  }

  function start() {
    if (!frame && !paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }

  function setPaused(value: boolean) {
    paused = value;
    stop();
    if (paused) pulses = [];
    render(0);
    start();
  }

  function locate(event: MouseEvent): Vec {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch') organize(...locate(event));
  });
  canvas.addEventListener('click', (event) => organize(...locate(event)));
  canvas.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activity();
    const next = points.find((p) => p.yellow && !p.locked);
    if (next) organize(...project(next.x, next.y));
  });

  preference.addEventListener('change', (event) => setPaused(event.matches));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
    else stop();
  }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);

  resize();
  scatter();
}
