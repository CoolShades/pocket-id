type RGB = [number, number, number];

type ThemeVariant = {
	bg: RGB;
	palette: [RGB, RGB, RGB, RGB];
};

export type Theme = {
	name: string;
	/** Pocket ID accent color string (oklch(...) or "default") applied when the
	 * theme is active on the login page. Matches one of the existing presets in
	 * accent-color-picker.svelte. */
	accent: string;
	dark: ThemeVariant;
	light: ThemeVariant;
};

// 10 curated themes, each with a matching dark + light variant. Light variants
// keep the identity of the theme (same hue family) but swap to a pale
// background and deeper, more saturated particle colors so they stay visible.
export const THEMES: readonly Theme[] = [
	{
		name: 'Ember',
		accent: 'oklch(0.68 0.2 50)', // Orange
		dark: {
			bg: [43, 41, 38],
			palette: [
				[200, 149, 108],
				[138, 125, 107],
				[107, 124, 90],
				[212, 196, 168]
			]
		},
		light: {
			bg: [248, 243, 232],
			palette: [
				[168, 100, 50],
				[110, 78, 55],
				[72, 95, 55],
				[150, 120, 85]
			]
		}
	},
	{
		name: 'Ocean',
		accent: 'oklch(0.6 0.2 240)', // Blue
		dark: {
			bg: [12, 25, 45],
			palette: [
				[30, 130, 180],
				[20, 90, 140],
				[60, 170, 210],
				[100, 200, 230]
			]
		},
		light: {
			bg: [230, 240, 250],
			palette: [
				[20, 80, 140],
				[10, 55, 100],
				[30, 115, 165],
				[60, 140, 190]
			]
		}
	},
	{
		name: 'Forest',
		accent: 'oklch(0.65 0.2 150)', // Green
		dark: {
			bg: [22, 32, 22],
			palette: [
				[90, 140, 60],
				[60, 110, 45],
				[140, 180, 90],
				[180, 200, 140]
			]
		},
		light: {
			bg: [236, 244, 230],
			palette: [
				[55, 100, 40],
				[35, 75, 30],
				[90, 130, 55],
				[115, 150, 80]
			]
		}
	},
	{
		name: 'Sunset',
		accent: 'oklch(0.68 0.2 50)', // Orange
		dark: {
			bg: [45, 25, 30],
			palette: [
				[230, 120, 60],
				[200, 80, 70],
				[250, 180, 80],
				[180, 60, 80]
			]
		},
		light: {
			bg: [253, 238, 228],
			palette: [
				[195, 85, 35],
				[160, 55, 50],
				[210, 140, 50],
				[150, 40, 65]
			]
		}
	},
	{
		name: 'Lavender',
		accent: 'oklch(0.6 0.24 300)', // Purple
		dark: {
			bg: [35, 28, 48],
			palette: [
				[160, 120, 200],
				[130, 90, 180],
				[200, 160, 230],
				[180, 140, 210]
			]
		},
		light: {
			bg: [244, 238, 252],
			palette: [
				[120, 80, 165],
				[95, 55, 145],
				[150, 110, 190],
				[135, 90, 175]
			]
		}
	},
	{
		name: 'Cherry',
		accent: 'oklch(0.63 0.2 15)', // Rose
		dark: {
			bg: [40, 18, 22],
			palette: [
				[200, 60, 80],
				[160, 40, 60],
				[230, 100, 120],
				[180, 50, 70]
			]
		},
		light: {
			bg: [252, 235, 238],
			palette: [
				[175, 35, 60],
				[140, 20, 45],
				[200, 70, 95],
				[160, 30, 55]
			]
		}
	},
	{
		name: 'Gold',
		accent: 'oklch(0.75 0.18 80)', // Amber
		dark: {
			bg: [40, 35, 20],
			palette: [
				[220, 190, 100],
				[180, 150, 60],
				[240, 210, 130],
				[200, 170, 80]
			]
		},
		light: {
			bg: [252, 246, 224],
			palette: [
				[175, 135, 45],
				[140, 105, 30],
				[200, 160, 65],
				[155, 120, 40]
			]
		}
	},
	{
		name: 'Midnight',
		accent: 'oklch(0.6 0.2 240)', // Blue
		dark: {
			bg: [10, 10, 20],
			palette: [
				[60, 60, 120],
				[40, 40, 100],
				[80, 80, 160],
				[100, 100, 180]
			]
		},
		light: {
			bg: [232, 234, 248],
			palette: [
				[40, 45, 110],
				[25, 30, 85],
				[60, 70, 145],
				[80, 90, 165]
			]
		}
	},
	{
		name: 'Neon',
		accent: 'oklch(0.6 0.15 180)', // Teal
		dark: {
			bg: [10, 10, 15],
			palette: [
				[0, 255, 180],
				[255, 0, 120],
				[0, 180, 255],
				[255, 255, 0]
			]
		},
		light: {
			bg: [248, 248, 252],
			palette: [
				[0, 180, 130],
				[210, 0, 105],
				[0, 140, 215],
				[200, 180, 0]
			]
		}
	},
	{
		name: 'Monochrome',
		accent: 'default',
		dark: {
			bg: [20, 20, 20],
			palette: [
				[180, 180, 180],
				[140, 140, 140],
				[220, 220, 220],
				[100, 100, 100]
			]
		},
		light: {
			bg: [240, 240, 240],
			palette: [
				[80, 80, 80],
				[50, 50, 50],
				[120, 120, 120],
				[30, 30, 30]
			]
		}
	}
] as const;

export const THEME_NAMES = THEMES.map((t) => t.name) as readonly string[];

export type ColorMode = 'light' | 'dark';

export function getTheme(name: string, mode: ColorMode): ThemeVariant {
	const theme = THEMES.find((t) => t.name === name) ?? THEMES[0];
	return theme[mode];
}

export function getThemeByName(name: string): Theme {
	return THEMES.find((t) => t.name === name) ?? THEMES[0];
}

export type DynamicBackgroundConfig = {
	theme: string;
	seed: number;
	density: number;
	flowSpeed: number;
	noiseScale: number;
	turbulence: number;
	trailFade: number;
	particleSize: number;
};

export const DEFAULT_CONFIG: DynamicBackgroundConfig = {
	theme: 'Neon',
	seed: 300177,
	density: 0.0376,
	flowSpeed: 2.36,
	noiseScale: 0.015,
	turbulence: 8,
	trailFade: 0.355,
	particleSize: 236
};
