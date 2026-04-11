<script lang="ts">
	import DynamicBackground from '$lib/components/dynamic-background/dynamic-background.svelte';
	import {
		DEFAULT_CONFIG,
		getThemeByName,
		THEMES,
		THEME_NAMES,
		type ColorMode,
		type DynamicBackgroundConfig
	} from '$lib/components/dynamic-background/themes';
	import { applyAccentColor } from '$lib/utils/accent-color-util';
	import { LucideChevronDown } from '@lucide/svelte';
	import { mode } from 'mode-watcher';
	import { slide } from 'svelte/transition';
	import { cn } from '$lib/utils/style';
	import SwitchWithLabel from '$lib/components/form/switch-with-label.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { m } from '$lib/paraglide/messages';
	import appConfigStore from '$lib/stores/application-configuration-store';
	import type { AllAppConfig } from '$lib/types/application-configuration.type';
	import { preventDefault } from '$lib/utils/event-util';
	import { createForm } from '$lib/utils/form-util';
	import { toast } from 'svelte-sonner';
	import { z } from 'zod/v4';

	let {
		callback,
		appConfig
	}: {
		appConfig: AllAppConfig;
		callback: (appConfig: Partial<AllAppConfig>) => Promise<void>;
	} = $props();

	let isLoading = $state(false);

	const initialValues = {
		dynamicBackgroundEnabled: appConfig.dynamicBackgroundEnabled,
		dynamicBackgroundTheme: appConfig.dynamicBackgroundTheme,
		dynamicBackgroundSeed: appConfig.dynamicBackgroundSeed,
		dynamicBackgroundDensity: appConfig.dynamicBackgroundDensity,
		dynamicBackgroundFlowSpeed: appConfig.dynamicBackgroundFlowSpeed,
		dynamicBackgroundNoiseScale: appConfig.dynamicBackgroundNoiseScale,
		dynamicBackgroundTurbulence: appConfig.dynamicBackgroundTurbulence,
		dynamicBackgroundTrailFade: appConfig.dynamicBackgroundTrailFade,
		dynamicBackgroundParticleSize: appConfig.dynamicBackgroundParticleSize
	};

	const themeEnum = z.enum(THEME_NAMES as unknown as [string, ...string[]]);

	const formSchema = z.object({
		dynamicBackgroundEnabled: z.boolean(),
		dynamicBackgroundTheme: themeEnum,
		dynamicBackgroundSeed: z.number().int().min(1).max(4294967295),
		dynamicBackgroundDensity: z.number().min(0.0001).max(0.19),
		dynamicBackgroundFlowSpeed: z.number().min(0.01).max(8.26),
		dynamicBackgroundNoiseScale: z.number().min(0.0001).max(0.053),
		dynamicBackgroundTurbulence: z.number().int().min(1).max(28),
		dynamicBackgroundTrailFade: z.number().min(0.005).max(0.89),
		dynamicBackgroundParticleSize: z.number().min(0.5).max(826)
	});

	let { inputs, ...form } = $derived(createForm(formSchema, initialValues));

	// Live preview config (derived from form state)
	let previewConfig = $derived<DynamicBackgroundConfig>({
		theme: $inputs.dynamicBackgroundTheme.value,
		seed: $inputs.dynamicBackgroundSeed.value,
		density: $inputs.dynamicBackgroundDensity.value,
		flowSpeed: $inputs.dynamicBackgroundFlowSpeed.value,
		noiseScale: $inputs.dynamicBackgroundNoiseScale.value,
		turbulence: $inputs.dynamicBackgroundTurbulence.value,
		trailFade: $inputs.dynamicBackgroundTrailFade.value,
		particleSize: $inputs.dynamicBackgroundParticleSize.value
	});

	// Debounced density so dragging the slider through high values doesn't thrash.
	let debouncedDensity = $state(initialValues.dynamicBackgroundDensity);
	let densityTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const d = $inputs.dynamicBackgroundDensity.value;
		if (densityTimer) clearTimeout(densityTimer);
		densityTimer = setTimeout(() => {
			debouncedDensity = d;
		}, 100);
		return () => {
			if (densityTimer) clearTimeout(densityTimer);
		};
	});
	let effectivePreview = $derived<DynamicBackgroundConfig>({
		...previewConfig,
		density: debouncedDensity
	});

	let currentMode = $derived<ColorMode>(mode.current ?? 'dark');

	let customiseOpen = $state(false);

	function applyTheme(name: string) {
		$inputs.dynamicBackgroundTheme.value = name;
		// Live-apply the theme's accent color for immediate visual feedback in
		// the admin page. The value is persisted to the DB on save (see onSubmit).
		applyAccentColor(getThemeByName(name).accent);
	}

	function prevSeed() {
		$inputs.dynamicBackgroundSeed.value = Math.max(1, $inputs.dynamicBackgroundSeed.value - 1);
	}
	function nextSeed() {
		$inputs.dynamicBackgroundSeed.value = Math.min(
			4294967295,
			$inputs.dynamicBackgroundSeed.value + 1
		);
	}
	function randomSeed() {
		$inputs.dynamicBackgroundSeed.value = Math.floor(Math.random() * 999999) + 1;
	}

	function resetDefaults() {
		$inputs.dynamicBackgroundTheme.value = DEFAULT_CONFIG.theme;
		$inputs.dynamicBackgroundSeed.value = DEFAULT_CONFIG.seed;
		$inputs.dynamicBackgroundDensity.value = DEFAULT_CONFIG.density;
		$inputs.dynamicBackgroundFlowSpeed.value = DEFAULT_CONFIG.flowSpeed;
		$inputs.dynamicBackgroundNoiseScale.value = DEFAULT_CONFIG.noiseScale;
		$inputs.dynamicBackgroundTurbulence.value = DEFAULT_CONFIG.turbulence;
		$inputs.dynamicBackgroundTrailFade.value = DEFAULT_CONFIG.trailFade;
		$inputs.dynamicBackgroundParticleSize.value = DEFAULT_CONFIG.particleSize;
	}

	async function onSubmit() {
		const data = form.validate();
		if (!data) return;
		isLoading = true;
		// Also persist the theme's accent color so the general form's picker
		// reflects it on next render.
		const payload = {
			...data,
			accentColor: getThemeByName(data.dynamicBackgroundTheme).accent
		};
		await callback(payload).finally(() => (isLoading = false));
		toast.success(m.application_configuration_updated_successfully());
	}

	const sliders = [
		{
			key: 'dynamicBackgroundDensity',
			label: m.particle_density(),
			min: 0.0001,
			max: 0.19,
			step: 0.0001
		},
		{ key: 'dynamicBackgroundFlowSpeed', label: m.flow_speed(), min: 0.01, max: 8.26, step: 0.01 },
		{
			key: 'dynamicBackgroundNoiseScale',
			label: m.noise_scale(),
			min: 0.0001,
			max: 0.053,
			step: 0.0001
		},
		{ key: 'dynamicBackgroundTurbulence', label: m.turbulence(), min: 1, max: 28, step: 1 },
		{
			key: 'dynamicBackgroundTrailFade',
			label: m.trail_fade(),
			min: 0.005,
			max: 0.89,
			step: 0.005
		},
		{
			key: 'dynamicBackgroundParticleSize',
			label: m.particle_size(),
			min: 0.5,
			max: 826,
			step: 0.5
		}
	] as const;
</script>

<form onsubmit={preventDefault(onSubmit)}>
	<fieldset class="flex flex-col gap-6" disabled={$appConfigStore.uiConfigDisabled}>
		<SwitchWithLabel
			id="dynamic-background-enabled"
			label={m.enable_dynamic_background()}
			description={m.dynamic_background_description()}
			bind:checked={$inputs.dynamicBackgroundEnabled.value}
		/>

		<!-- Live preview, rendered in the admin's current color mode -->
		<div class="border-border relative h-56 w-full overflow-hidden rounded-lg border">
			<DynamicBackground config={effectivePreview} mode={currentMode} class="h-full w-full" />
		</div>

		<!-- Customise Pattern disclosure: seed + tunable parameters -->
		<div class="border-border overflow-hidden rounded-lg border">
			<button
				type="button"
				class="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors"
				onclick={() => (customiseOpen = !customiseOpen)}
				aria-expanded={customiseOpen}
			>
				<span>{m.customise_pattern()}</span>
				<LucideChevronDown
					class={cn(
						'text-muted-foreground size-4 transition-transform duration-200',
						customiseOpen && 'rotate-180'
					)}
				/>
			</button>
			{#if customiseOpen}
				<div transition:slide={{ duration: 200 }}>
					<div class="flex flex-col gap-5 p-4 pt-2">
						<!-- Seed -->
						<Field.Field>
							<Field.Label>{m.seed()}</Field.Label>
							<div class="flex gap-2">
								<Input
									type="number"
									min="1"
									max="4294967295"
									step="1"
									bind:value={$inputs.dynamicBackgroundSeed.value}
								/>
								<Button type="button" variant="outline" onclick={prevSeed}>{m.prev()}</Button>
								<Button type="button" variant="outline" onclick={nextSeed}>{m.next()}</Button>
								<Button type="button" variant="outline" onclick={randomSeed}>{m.random()}</Button>
							</div>
							{#if $inputs.dynamicBackgroundSeed.error}
								<Field.Error>{$inputs.dynamicBackgroundSeed.error}</Field.Error>
							{/if}
						</Field.Field>

						<!-- Sliders -->
						<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
							{#each sliders as s}
								<Field.Field>
									<Field.Label>
										{s.label}
										<span class="text-muted-foreground ml-2 font-mono text-xs">
											{$inputs[s.key].value}
										</span>
									</Field.Label>
									<input
										type="range"
										min={s.min}
										max={s.max}
										step={s.step}
										class="accent-primary w-full"
										bind:value={$inputs[s.key].value}
									/>
									{#if $inputs[s.key].error}
										<Field.Error>{$inputs[s.key].error}</Field.Error>
									{/if}
								</Field.Field>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Theme grid — each tile shows only the admin's current color mode -->
		<Field.Field>
			<Field.Label>{m.theme()}</Field.Label>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{#each THEMES as t}
					{@const active = $inputs.dynamicBackgroundTheme.value === t.name}
					{@const variant = t[currentMode]}
					{@const textClass = currentMode === 'dark' ? 'text-white' : 'text-black'}
					{@const dotBorder = currentMode === 'dark' ? 'border-white/40' : 'border-black/20'}
					<button
						type="button"
						onclick={() => applyTheme(t.name)}
						class={[
							'relative flex h-20 flex-col justify-between overflow-hidden rounded-md border-2 p-2 text-xs font-medium transition-all',
							active
								? 'border-primary ring-primary/40 ring-2'
								: 'border-transparent hover:scale-[1.02]'
						]}
						style={`background-color: rgb(${variant.bg[0]},${variant.bg[1]},${variant.bg[2]});`}
					>
						<span class="self-center {textClass}">{t.name}</span>
						<div class="flex justify-center gap-1">
							{#each variant.palette as c}
								<span
									class="h-2 w-2 rounded-full border {dotBorder}"
									style={`background-color: rgb(${c[0]},${c[1]},${c[2]})`}
								></span>
							{/each}
						</div>
					</button>
				{/each}
			</div>
			{#if $inputs.dynamicBackgroundTheme.error}
				<Field.Error>{$inputs.dynamicBackgroundTheme.error}</Field.Error>
			{/if}
		</Field.Field>

		<div class="flex justify-between gap-2">
			<Button type="button" variant="outline" onclick={resetDefaults}>
				{m.reset_to_defaults()}
			</Button>
			<Button {isLoading} type="submit">{m.save()}</Button>
		</div>
	</fieldset>
</form>
