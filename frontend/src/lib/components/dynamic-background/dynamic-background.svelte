<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import DynamicWorker from './worker.ts?worker';
	import { getTheme, type ColorMode, type DynamicBackgroundConfig } from './themes';

	// Theme-matched bg color for the container, so if the user drags the
	// window beyond the rendered canvas area there's no black see-through.
	function bgCss(themeName: string, m: ColorMode): string {
		const v = getTheme(themeName, m);
		return `rgb(${v.bg[0]},${v.bg[1]},${v.bg[2]})`;
	}

	let {
		config,
		mode,
		class: className = '',
		onfallback
	}: {
		config: DynamicBackgroundConfig;
		mode: ColorMode;
		class?: string;
		onfallback?: () => void;
	} = $props();

	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let container = $state<HTMLDivElement | null>(null);
	let worker: Worker | null = null;
	let initialized = false;
	let lastCfg: DynamicBackgroundConfig | null = null;
	let lastMode: ColorMode | null = null;

	let containerBg = $derived(bgCss(config.theme, mode));

	function triggerFallback(reason: unknown) {
		console.warn('[DynamicBackground] falling back to static image:', reason);
		try {
			worker?.terminate();
		} catch {
			// ignore
		}
		worker = null;
		onfallback?.();
	}

	function buildCfgMessage(c: DynamicBackgroundConfig, m: ColorMode) {
		const variant = getTheme(c.theme, m);
		return {
			seed: c.seed,
			density: c.density,
			flowSpeed: c.flowSpeed,
			noiseScale: c.noiseScale,
			turbulence: c.turbulence,
			trailFade: c.trailFade,
			particleSize: c.particleSize,
			bg: variant.bg,
			palette: variant.palette
		};
	}

	function postWake() {
		worker?.postMessage({ type: 'wake' });
	}

	function onVisibilityChange() {
		if (document.visibilityState === 'visible') postWake();
	}

	// The canvas is rendered at a generous fixed size picked at mount time
	// and never resized after that. Window resizes just change what portion
	// is visible through the container's overflow:hidden. If the container
	// somehow grows beyond the canvas, the container's theme-colored bg
	// fills the gap — no reinit, no browser canvas-limit risk, no flashing.
	function computeRenderSize() {
		const sw = window.screen?.width ?? window.innerWidth;
		const sh = window.screen?.height ?? window.innerHeight;
		const w = Math.max(sw, window.innerWidth, 2560);
		const h = Math.max(sh, window.innerHeight, 1440);
		return { w: Math.floor(w), h: Math.floor(h) };
	}

	let renderW = 0;
	let renderH = 0;

	onMount(() => {
		if (!canvasEl || !container) return;
		try {
			const offscreen = canvasEl.transferControlToOffscreen();
			worker = new DynamicWorker();
			worker.onerror = (e) => triggerFallback(e.message || e);
			worker.onmessageerror = (e) => triggerFallback(e);

			const size = computeRenderSize();
			renderW = size.w;
			renderH = size.h;
			// Pin the canvas CSS box to the render size so the container's
			// overflow:hidden clips the excess, rather than stretching it.
			canvasEl.style.width = `${renderW}px`;
			canvasEl.style.height = `${renderH}px`;

			worker.postMessage(
				{
					type: 'init',
					canvas: offscreen,
					cssW: renderW,
					cssH: renderH,
					cfg: buildCfgMessage(config, mode)
				},
				[offscreen]
			);
			initialized = true;
			lastCfg = { ...config };
			lastMode = mode;

			// No resize observer — canvas dimensions are fixed at mount time.
			// The container's overflow:hidden + theme-colored bg handles any
			// window size changes without ever reinitializing the canvas.

			// Wake on user interaction or when the tab regains visibility.
			// Window-level mousemove/touch because the background spans the
			// whole viewport and we want movement anywhere to wake it.
			window.addEventListener('mousemove', postWake, { passive: true });
			window.addEventListener('touchstart', postWake, { passive: true });
			document.addEventListener('visibilitychange', onVisibilityChange);
		} catch (err) {
			triggerFallback(err);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('mousemove', postWake);
			window.removeEventListener('touchstart', postWake);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		}
		try {
			worker?.terminate();
		} catch {
			// ignore
		}
		worker = null;
	});

	// React to config or mode changes with targeted messages — avoids full reinit.
	$effect(() => {
		if (!worker || !initialized || !lastCfg || lastMode === null) return;
		const prev = lastCfg;
		const next = config;
		const prevMode = lastMode;
		const nextMode = mode;

		// Theme name OR color mode change → swap bg + palette atomically
		if (prev.theme !== next.theme || prevMode !== nextMode) {
			const variant = getTheme(next.theme, nextMode);
			worker.postMessage({ type: 'theme', bg: variant.bg, palette: variant.palette });
		}
		if (prev.seed !== next.seed) {
			worker.postMessage({ type: 'seed', value: next.seed });
		}
		const params: (keyof DynamicBackgroundConfig)[] = [
			'density',
			'flowSpeed',
			'noiseScale',
			'turbulence',
			'trailFade',
			'particleSize'
		];
		for (const key of params) {
			if (prev[key] !== next[key]) {
				worker.postMessage({ type: 'param', key, value: next[key] });
			}
		}
		lastCfg = { ...next };
		lastMode = nextMode;
	});
</script>

<div
	bind:this={container}
	class="relative overflow-hidden {className}"
	style={`background-color: ${containerBg};`}
>
	<canvas bind:this={canvasEl} class="absolute top-0 left-0 block"></canvas>
</div>
