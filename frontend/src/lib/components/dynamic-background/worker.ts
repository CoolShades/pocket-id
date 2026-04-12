/// <reference lib="webworker" />

// Dynamic background worker — runs the flow-field particle animation
// entirely off the main thread via OffscreenCanvas. Ported from the
// Pocket ID background generator prototype with a message-handler split
// so most param changes no longer reinitialize particles (keeping the
// admin live preview smooth).

type RGB = [number, number, number];

type Config = {
	seed: number;
	density: number;
	flowSpeed: number;
	noiseScale: number;
	turbulence: number;
	trailFade: number;
	particleSize: number;
	bg: RGB;
	palette: [RGB, RGB, RGB, RGB];
};

type InitMessage = {
	type: 'init';
	canvas?: OffscreenCanvas;
	cssW: number;
	cssH: number;
	cfg: Config;
};

type ParamMessage = {
	type: 'param';
	key: 'density' | 'flowSpeed' | 'noiseScale' | 'turbulence' | 'trailFade' | 'particleSize';
	value: number;
};
type ThemeMessage = { type: 'theme'; bg: RGB; palette: [RGB, RGB, RGB, RGB] };
type SeedMessage = { type: 'seed'; value: number };
type ActivateMessage = { type: 'activate' };
type DeactivateMessage = { type: 'deactivate' };

type IncomingMessage =
	| InitMessage
	| ParamMessage
	| ThemeMessage
	| SeedMessage
	| ActivateMessage
	| DeactivateMessage;

// ── SIMPLEX 3D NOISE ──────────────────────────────────────────────────
const PERM = new Uint8Array(512);
const G3: number[][] = [
	[1, 1, 0],
	[-1, 1, 0],
	[1, -1, 0],
	[-1, -1, 0],
	[1, 0, 1],
	[-1, 0, 1],
	[1, 0, -1],
	[-1, 0, -1],
	[0, 1, 1],
	[0, -1, 1],
	[0, 1, -1],
	[0, -1, -1]
];

function seedNoise(seed: number): void {
	const p = new Uint8Array(256);
	for (let i = 0; i < 256; i++) p[i] = i;
	let s = seed;
	for (let i = 255; i > 0; i--) {
		s = (s * 16807) % 2147483647;
		const j = s % (i + 1);
		const t = p[i];
		p[i] = p[j];
		p[j] = t;
	}
	for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

function noise3(x: number, y: number, z: number): number {
	const F = 1 / 3,
		K = 1 / 6;
	const s = (x + y + z) * F;
	const i = Math.floor(x + s),
		j = Math.floor(y + s),
		k = Math.floor(z + s);
	const t = (i + j + k) * K;
	const x0 = x - (i - t),
		y0 = y - (j - t),
		z0 = z - (k - t);
	let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
	if (x0 >= y0) {
		if (y0 >= z0) {
			i1 = 1;
			j1 = 0;
			k1 = 0;
			i2 = 1;
			j2 = 1;
			k2 = 0;
		} else if (x0 >= z0) {
			i1 = 1;
			j1 = 0;
			k1 = 0;
			i2 = 1;
			j2 = 0;
			k2 = 1;
		} else {
			i1 = 0;
			j1 = 0;
			k1 = 1;
			i2 = 1;
			j2 = 0;
			k2 = 1;
		}
	} else {
		if (y0 < z0) {
			i1 = 0;
			j1 = 0;
			k1 = 1;
			i2 = 0;
			j2 = 1;
			k2 = 1;
		} else if (x0 < z0) {
			i1 = 0;
			j1 = 1;
			k1 = 0;
			i2 = 0;
			j2 = 1;
			k2 = 1;
		} else {
			i1 = 0;
			j1 = 1;
			k1 = 0;
			i2 = 1;
			j2 = 1;
			k2 = 0;
		}
	}
	const x1 = x0 - i1 + K,
		y1 = y0 - j1 + K,
		z1 = z0 - k1 + K;
	const x2 = x0 - i2 + 2 * K,
		y2 = y0 - j2 + 2 * K,
		z2 = z0 - k2 + 2 * K;
	const x3 = x0 - 1 + 0.5,
		y3 = y0 - 1 + 0.5,
		z3 = z0 - 1 + 0.5;
	const ii = i & 255,
		jj = j & 255,
		kk = k & 255;
	let n0 = 0,
		n1 = 0,
		n2 = 0,
		n3 = 0,
		tt: number;
	tt = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
	if (tt > 0) {
		tt *= tt;
		const g = G3[PERM[ii + PERM[jj + PERM[kk]]] % 12];
		n0 = tt * tt * (g[0] * x0 + g[1] * y0 + g[2] * z0);
	}
	tt = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
	if (tt > 0) {
		tt *= tt;
		const g = G3[PERM[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]] % 12];
		n1 = tt * tt * (g[0] * x1 + g[1] * y1 + g[2] * z1);
	}
	tt = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
	if (tt > 0) {
		tt *= tt;
		const g = G3[PERM[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]] % 12];
		n2 = tt * tt * (g[0] * x2 + g[1] * y2 + g[2] * z2);
	}
	tt = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
	if (tt > 0) {
		tt *= tt;
		const g = G3[PERM[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]] % 12];
		n3 = tt * tt * (g[0] * x3 + g[1] * y3 + g[2] * z3);
	}
	return 32 * (n0 + n1 + n2 + n3);
}

// ── PRNG (mulberry32) ─────────────────────────────────────────────────
function mulberry32(a: number): () => number {
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// ── STATE ──────────────────────────────────────────────────────────────
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let W = 0,
	H = 0;
let gen = 0;
let startMs = 0; // performance.now() at init — keeps noise time relative so it starts at 0

// Animation state machine driven by activate/deactivate messages from the
// Svelte host. While the user is active (cursor on page + window focused +
// tab visible) the worker stays in 'full' forever. When the user goes idle
// the host sends deactivate → 'decel' → 'sleep'. On re-activation the host
// sends activate → 'ramp-up' → 'full', with the ramp starting from the
// current speedFactor so there's no jump if we were mid-decel.
type AnimPhase = 'ramp-up' | 'full' | 'decel' | 'sleep';
let phase: AnimPhase = 'sleep';
let phaseStartMs = 0; // wall-clock timestamp when the current phase began
let phaseStartSpeed = 0; // speedFactor at the start of the current phase
let speedFactor = 0; // current effective speed, 0..1

let px: Float32Array, py: Float32Array;
let vx: Float32Array, vy: Float32Array;
let prevX: Float32Array, prevY: Float32Array;
let ppX: Float32Array, ppY: Float32Array;
let pMaxSpd: Float32Array;
let pColorIdx: Uint8Array;
let pAlphaIdx: Uint8Array;
let count = 0;

const CELL = 20;
// Time-based durations (wall-clock ms). Frame-counted durations would run
// twice as fast on 120Hz displays (common on modern phones), halving all
// the animation's tuning. Using performance.now() deltas keeps the feel
// identical across 60Hz, 90Hz, 120Hz, and 144Hz refresh rates.
const RAMP_UP_MS = 3000; //  3s
const DECEL_MS = 10000; // 10s
const GRID_REFRESH_MS = 500; // recompute flow field every 500ms
const NUM_COLORS = 4;
const NUM_ALPHA = 4;
const NUM_BUCKETS = NUM_COLORS * NUM_ALPHA;
// Dark-mode stroke alphas (original prototype values — tuned for light strokes on dark bg).
const ALPHA_LEVELS_DARK = [0.03, 0.07, 0.12, 0.18];
// Light-mode stroke alphas — boosted to compensate for the logarithmic drop in
// perceived contrast when drawing dark strokes on a pale background. Without
// this, light-mode trails look thin/faded even at the same trailFade value.
const ALPHA_LEVELS_LIGHT = [0.08, 0.16, 0.26, 0.36];
let ALPHA_LEVELS = ALPHA_LEVELS_DARK;

function isLightBg(bg: RGB): boolean {
	// Rec. 709 relative luminance (gamma-unaware but fine for a threshold).
	return 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] > 140;
}

let gridCols = 0,
	gridRows = 0;
let gridAngles: Float32Array = new Float32Array(0);

const buckets: number[][] = [];
for (let i = 0; i < NUM_BUCKETS; i++) buckets[i] = [];
let styleCache: string[] = [];

let cfg: Config = {
	seed: 12345,
	density: 4,
	flowSpeed: 1,
	noiseScale: 0.005,
	turbulence: 2,
	trailFade: 0.005,
	particleSize: 1.5,
	bg: [43, 41, 38],
	palette: [
		[200, 149, 108],
		[138, 125, 107],
		[107, 124, 90],
		[212, 196, 168]
	]
};

function rebuildStyleCache(): void {
	ALPHA_LEVELS = isLightBg(cfg.bg) ? ALPHA_LEVELS_LIGHT : ALPHA_LEVELS_DARK;
	styleCache = [];
	for (let ci = 0; ci < NUM_COLORS; ci++) {
		for (let ai = 0; ai < NUM_ALPHA; ai++) {
			const c = cfg.palette[ci];
			styleCache.push(`rgba(${c[0]},${c[1]},${c[2]},${ALPHA_LEVELS[ai]})`);
		}
	}
}

function computeGrid(t: number): void {
	const ns = cfg.noiseScale;
	const turb = cfg.turbulence;
	const PI2 = Math.PI * 2;
	const PI = Math.PI;
	for (let r = 0; r < gridRows; r++) {
		for (let c = 0; c < gridCols; c++) {
			const wx = c * CELL * ns;
			const wy = r * CELL * ns;
			gridAngles[r * gridCols + c] =
				noise3(wx, wy, t) * PI2 * turb + noise3(wx * 2 + 100, wy * 2 + 100, t * 0.5) * PI * 0.3;
		}
	}
}

function sampleGrid(x: number, y: number): number {
	const gx = x / CELL;
	const gy = y / CELL;
	const c0 = Math.max(0, Math.min(gridCols - 2, gx | 0));
	const r0 = Math.max(0, Math.min(gridRows - 2, gy | 0));
	const fx = gx - (gx | 0);
	const fy = gy - (gy | 0);
	const top =
		gridAngles[r0 * gridCols + c0] +
		(gridAngles[r0 * gridCols + c0 + 1] - gridAngles[r0 * gridCols + c0]) * fx;
	const bot =
		gridAngles[(r0 + 1) * gridCols + c0] +
		(gridAngles[(r0 + 1) * gridCols + c0 + 1] - gridAngles[(r0 + 1) * gridCols + c0]) * fx;
	return top + (bot - top) * fy;
}

function allocateParticles(): void {
	const rng = mulberry32(cfg.seed);
	seedNoise(cfg.seed);
	count = ((W * H * cfg.density) / 1000) | 0;
	px = new Float32Array(count);
	py = new Float32Array(count);
	vx = new Float32Array(count);
	vy = new Float32Array(count);
	prevX = new Float32Array(count);
	prevY = new Float32Array(count);
	ppX = new Float32Array(count);
	ppY = new Float32Array(count);
	pMaxSpd = new Float32Array(count);
	pColorIdx = new Uint8Array(count);
	pAlphaIdx = new Uint8Array(count);
	for (let i = 0; i < count; i++) {
		px[i] = rng() * W;
		py[i] = rng() * H;
		prevX[i] = px[i];
		prevY[i] = py[i];
		ppX[i] = px[i];
		ppY[i] = py[i];
		pMaxSpd[i] = cfg.flowSpeed * (0.5 + rng() * 1.5);
		pColorIdx[i] = (rng() * NUM_COLORS) | 0;
		// Alpha bucket is fixed per particle (no per-frame speed modulation) so
		// that draw order is stable across frames — otherwise overlapping large
		// particles visibly z-flicker as their buckets change.
		pAlphaIdx[i] = (rng() * NUM_ALPHA) | 0;
	}
	gridCols = ((W / CELL) | 0) + 2;
	gridRows = ((H / CELL) | 0) + 2;
	gridAngles = new Float32Array(gridCols * gridRows);
	computeGrid(0);
	rebuildStyleCache();
}

function init(): void {
	if (!ctx) return;
	gen++;
	speedFactor = 0;
	startMs = performance.now();
	allocateParticles();
	ctx.fillStyle = `rgb(${cfg.bg[0]},${cfg.bg[1]},${cfg.bg[2]})`;
	ctx.fillRect(0, 0, W, H);
	enterPhase('ramp-up');
	startLoop();
}

function enterPhase(next: AnimPhase): void {
	phase = next;
	phaseStartMs = performance.now();
	phaseStartSpeed = speedFactor;
}

// Host reports the user is active again. From sleep/decel, kick off a new
// ramp-up starting at whatever speed we currently have (so interrupting a
// decel mid-way doesn't jump back to zero). From ramp-up/full, do nothing.
function activate(): void {
	if (phase === 'ramp-up' || phase === 'full') return;
	const wasSleeping = phase === 'sleep';
	enterPhase('ramp-up');
	if (wasSleeping) startLoop();
}

// Host reports the user is idle. Begin the decel from whatever speed we
// currently have, so activating back mid-decel is symmetric.
function deactivate(): void {
	if (phase === 'decel' || phase === 'sleep') return;
	enterPhase('decel');
}

function startLoop(): void {
	if (!ctx) return;
	const myGen = gen;
	let lastGridMs = -Infinity;
	let lastTickMs = performance.now();
	const tick = (): void => {
		if (myGen !== gen || phase === 'sleep' || !ctx) return;
		const nowMs = performance.now();
		const phaseElapsedMs = nowMs - phaseStartMs;
		// dt in "60fps frame units": 1 on a 60Hz display, 0.5 on 120Hz, 2 on
		// 30Hz. Clamped to 3 so a returning-from-background tab doesn't
		// teleport particles on the first frame after a long pause.
		const dt = Math.min(3, (nowMs - lastTickMs) / (1000 / 60));
		lastTickMs = nowMs;
		// Advance the phase state machine based on wall-clock elapsed time —
		// identical feel on 60Hz, 90Hz, 120Hz, 144Hz displays. The 'full'
		// phase has no duration; it runs forever until the host sends
		// deactivate.
		if (phase === 'ramp-up') {
			const t = Math.min(1, phaseElapsedMs / RAMP_UP_MS);
			speedFactor = phaseStartSpeed + (1 - phaseStartSpeed) * t;
			if (speedFactor >= 1) {
				speedFactor = 1;
				enterPhase('full');
			}
		} else if (phase === 'full') {
			speedFactor = 1;
		} else if (phase === 'decel') {
			const t = Math.min(1, phaseElapsedMs / DECEL_MS);
			speedFactor = phaseStartSpeed * (1 - t);
			if (speedFactor <= 0) {
				speedFactor = 0;
				enterPhase('sleep');
				return;
			}
		}
		// Scale trailFade by speedFactor so the canvas never washes faster
		// than particles can redraw. At speedFactor 0 there's no fade at all
		// (canvas frozen); at full speed the configured trailFade applies.
		// This eliminates the wake flash and keeps decel visually coherent.
		ctx.fillStyle = `rgba(${cfg.bg[0]},${cfg.bg[1]},${cfg.bg[2]},${cfg.trailFade * speedFactor})`;
		ctx.fillRect(0, 0, W, H);
		if (nowMs - lastGridMs >= GRID_REFRESH_MS) {
			// Old constant was frame * 0.002; at 60fps that's 0.12 per second.
			// Use relative time from init so the noise field starts at 0 (matching
			// the computeGrid(0) call in init) and evolves smoothly.
			computeGrid((nowMs - startMs) * 0.00012);
			lastGridMs = nowMs;
		}
		for (let b = 0; b < NUM_BUCKETS; b++) buckets[b].length = 0;
		for (let i = 0; i < count; i++) {
			const angle = sampleGrid(px[i], py[i]);
			vx[i] += Math.cos(angle) * 0.15 * speedFactor * dt;
			vy[i] += Math.sin(angle) * 0.15 * speedFactor * dt;
			const spd = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
			const ms = pMaxSpd[i] * speedFactor;
			if (spd > ms) {
				const scale = ms > 0 ? ms / spd : 0;
				vx[i] *= scale;
				vy[i] *= scale;
			}
			ppX[i] = prevX[i];
			ppY[i] = prevY[i];
			prevX[i] = px[i];
			prevY[i] = py[i];
			px[i] += vx[i] * dt;
			py[i] += vy[i] * dt;
			// Reflect at the edges instead of wrapping around. With large
			// particle sizes the wrap-teleport was visible as a sudden
			// disappear/reappear; bouncing keeps particles on-screen.
			if (px[i] > W) {
				px[i] = W;
				vx[i] = -Math.abs(vx[i]);
			} else if (px[i] < 0) {
				px[i] = 0;
				vx[i] = Math.abs(vx[i]);
			}
			if (py[i] > H) {
				py[i] = H;
				vy[i] = -Math.abs(vy[i]);
			} else if (py[i] < 0) {
				py[i] = 0;
				vy[i] = Math.abs(vy[i]);
			}
			buckets[pColorIdx[i] * NUM_ALPHA + pAlphaIdx[i]].push(i);
		}
		ctx.lineWidth = cfg.particleSize;
		ctx.lineCap = 'round';
		for (let b = 0; b < NUM_BUCKETS; b++) {
			const bkt = buckets[b];
			if (!bkt.length) continue;
			ctx.strokeStyle = styleCache[b];
			ctx.beginPath();
			for (let j = 0; j < bkt.length; j++) {
				const i = bkt[j];
				ctx.moveTo(ppX[i], ppY[i]);
				ctx.quadraticCurveTo(prevX[i], prevY[i], px[i], py[i]);
			}
			ctx.stroke();
		}
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

function rescaleFlowSpeed(): void {
	// Replay the same PRNG sequence init() used so the per-particle speed
	// jitter stays deterministic across a flowSpeed change. init() draws
	// 5 random numbers per particle: px, py, pMaxSpd, colorIdx, alphaIdx.
	const rng = mulberry32(cfg.seed);
	for (let i = 0; i < count; i++) {
		rng(); // px
		rng(); // py
		pMaxSpd[i] = cfg.flowSpeed * (0.5 + rng() * 1.5);
		rng(); // colorIdx
		rng(); // alphaIdx
	}
}

self.onmessage = (e: MessageEvent<IncomingMessage>): void => {
	const d = e.data;
	if (d.type === 'init') {
		if (d.canvas) {
			canvas = d.canvas;
			ctx = canvas.getContext('2d', { alpha: false });
		}
		if (!canvas || !ctx) return;
		// Hardcode backing pixel dpr at 1 — the canvas is already generously
		// sized and running at 2x would quadruple the per-frame fillRect cost
		// (which is the dominant rendering expense) for no visible benefit on
		// a soft animated background.
		W = Math.max(1, Math.floor(d.cssW));
		H = Math.max(1, Math.floor(d.cssH));
		canvas.width = W;
		canvas.height = H;
		Object.assign(cfg, d.cfg);
		init();
	} else if (d.type === 'param') {
		cfg[d.key] = d.value;
		if (d.key === 'density') {
			init();
		} else if (d.key === 'flowSpeed') {
			rescaleFlowSpeed();
		} else if (d.key === 'noiseScale' || d.key === 'turbulence') {
			computeGrid((performance.now() - startMs) * 0.00012);
		}
		// trailFade / particleSize: read per-frame, no action needed
	} else if (d.type === 'theme') {
		cfg.bg = d.bg;
		cfg.palette = d.palette;
		rebuildStyleCache();
	} else if (d.type === 'seed') {
		cfg.seed = d.value;
		init();
	} else if (d.type === 'activate') {
		activate();
	} else if (d.type === 'deactivate') {
		deactivate();
	}
};
