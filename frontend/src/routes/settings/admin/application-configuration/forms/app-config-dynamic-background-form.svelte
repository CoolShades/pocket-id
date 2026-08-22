<script lang="ts">
	import DynamicBackground from '$lib/components/dynamic-background/dynamic-background.svelte';
	import {
		DEFAULT_CONFIG,
		THEMES,
		THEME_NAMES,
		type ColorMode,
		type DynamicBackgroundConfig
	} from '$lib/components/dynamic-background/themes';
	import { LucideChevronDown } from '@lucide/svelte';
	import { mode } from 'mode-watcher';
	import { slide } from 'svelte/transition';
	import { cn } from '$lib/utils/style';
	import SwitchWithLabel from '$lib/components/form/switch-with-label.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
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
		dynamicBackgroundDensity: z.number().min(0.0001).max(0.2),
		dynamicBackgroundFlowSpeed: z.number().min(0.01).max(10),
		dynamicBackgroundNoiseScale: z.number().min(0.0001).max(0.05),
		dynamicBackgroundTurbulence: z.number().int().min(1).max(30),
		dynamicBackgroundTrailFade: z.number().min(0.005).max(0.9),
		dynamicBackgroundParticleSize: z.number().min(0.5).max(1000)
	});

	let { inputs, ...form } = $derived(createForm(formSchema, initialValues));

	// Live preview config (derived from form state). The seed is random per
	// mount, matching what visitors get on the login page.
	const previewSeed = Math.floor(Math.random() * 4294967295) + 1;
	let previewConfig = $derived<DynamicBackgroundConfig>({
		theme: $inputs.dynamicBackgroundTheme.value,
		seed: previewSeed,
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

	let customizeOpen = $state(false);

	function resetDefaults() {
		$inputs.dynamicBackgroundTheme.value = DEFAULT_CONFIG.theme;
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
		await callback(data).finally(() => (isLoading = false));
		toast.success(m.application_configuration_updated_successfully());
	}

	const sliders = [
		{
			key: 'dynamicBackgroundDensity',
			label: m.particle_density(),
			min: 0.0001,
			max: 0.2,
			step: 0.0001
		},
		{ key: 'dynamicBackgroundFlowSpeed', label: m.flow_speed(), min: 0.01, max: 10, step: 0.01 },
		{
			key: 'dynamicBackgroundNoiseScale',
			label: m.noise_scale(),
			min: 0.0001,
			max: 0.05,
			step: 0.0001
		},
		{ key: 'dynamicBackgroundTurbulence', label: m.turbulence(), min: 1, max: 30, step: 1 },
		{
			key: 'dynamicBackgroundTrailFade',
			label: m.trail_fade(),
			min: 0.005,
			max: 0.9,
			step: 0.005
		},
		{
			key: 'dynamicBackgroundParticleSize',
			label: m.particle_size(),
			min: 0.5,
			max: 1000,
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

		<!-- Customize pattern disclosure: tunable parameters -->
		<div class="border-border overflow-hidden rounded-lg border">
			<button
				type="button"
				class="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors"
				onclick={() => (customizeOpen = !customizeOpen)}
				aria-expanded={customizeOpen}
			>
				<span>{m.customize_pattern()}</span>
				<LucideChevronDown
					class={cn(
						'text-muted-foreground size-4 transition-transform duration-200',
						customizeOpen && 'rotate-180'
					)}
				/>
			</button>
			{#if customizeOpen}
				<div transition:slide={{ duration: 200 }}>
					<div class="flex flex-col gap-5 p-4 pt-2">
						<!-- Sliders -->
						<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
							{#each sliders as s (s.key)}
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
				{#each THEMES as t (t.name)}
					{@const active = $inputs.dynamicBackgroundTheme.value === t.name}
					{@const variant = t[currentMode]}
					{@const textClass = currentMode === 'dark' ? 'text-white' : 'text-black'}
					{@const dotBorder = currentMode === 'dark' ? 'border-white/40' : 'border-black/20'}
					<button
						type="button"
						onclick={() => ($inputs.dynamicBackgroundTheme.value = t.name)}
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
							{#each variant.palette as c, i (i)}
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
