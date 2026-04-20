<script module lang="ts">
	// Persist the last failing background image URL across route remounts so
	// login pages without a background do not briefly retry the image and stutter.
	let persistedMissingBackgroundImageUrl: string | undefined;
</script>

<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import appConfigStore from '$lib/stores/application-configuration-store';
	import { cachedBackgroundImage } from '$lib/utils/cached-image-util';
	import { applyAccentColor } from '$lib/utils/accent-color-util';
	import { cn } from '$lib/utils/style';
	import { mode } from 'mode-watcher';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import DynamicBackground from './dynamic-background/dynamic-background.svelte';
	import { getThemeByName, type DynamicBackgroundConfig } from './dynamic-background/themes';
	import * as Card from './ui/card';

	let {
		children,
		showAlternativeSignInMethodButton = false
	}: {
		children: Snippet;
		showAlternativeSignInMethodButton?: boolean;
	} = $props();

	let missingBackgroundImageUrl = $state<string | undefined>(persistedMissingBackgroundImageUrl);
	let loadedBackgroundImageUrl = $state<string | undefined>();
	let isInitialLoad = $state(false);
	let backgroundImageUrl = $derived(cachedBackgroundImage.getUrl());
	let imageError = $derived(missingBackgroundImageUrl === backgroundImageUrl);
	let imageLoaded = $derived(loadedBackgroundImageUrl === backgroundImageUrl);
	let animate = $derived(isInitialLoad && imageLoaded && !$appConfigStore.disableAnimations);

	afterNavigate((e) => {
		isInitialLoad = !e?.from?.url;
	});

	function onBackgroundImageLoad() {
		loadedBackgroundImageUrl = backgroundImageUrl;
		if (persistedMissingBackgroundImageUrl === backgroundImageUrl) {
			persistedMissingBackgroundImageUrl = undefined;
			missingBackgroundImageUrl = undefined;
		}
	}

	function onBackgroundImageError() {
		loadedBackgroundImageUrl = undefined;
		persistedMissingBackgroundImageUrl = backgroundImageUrl;
		missingBackgroundImageUrl = backgroundImageUrl;
	}

	const isDesktop = new MediaQuery('min-width: 1024px');

	let canUseDynamic = $state(false);
	let dynamicFailed = $state(false);

	// Fresh seed each mount so the pattern differs per visit; admin preview still uses the configured seed.
	const randomSeed = Math.floor(Math.random() * 4294967295) + 1;

	onMount(() => {
		const offscreenOk =
			typeof HTMLCanvasElement !== 'undefined' &&
			'transferControlToOffscreen' in HTMLCanvasElement.prototype;
		const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => {
			canUseDynamic = offscreenOk && !mql.matches;
		};
		update();
		mql.addEventListener('change', update);
		return () => mql.removeEventListener('change', update);
	});

	let useDynamic = $derived(
		$appConfigStore.dynamicBackgroundEnabled &&
			!$appConfigStore.disableAnimations &&
			canUseDynamic &&
			!dynamicFailed
	);

	let dynamicConfig = $derived<DynamicBackgroundConfig>({
		theme: $appConfigStore.dynamicBackgroundTheme,
		seed: randomSeed,
		density: $appConfigStore.dynamicBackgroundDensity,
		flowSpeed: $appConfigStore.dynamicBackgroundFlowSpeed,
		noiseScale: $appConfigStore.dynamicBackgroundNoiseScale,
		turbulence: $appConfigStore.dynamicBackgroundTurbulence,
		trailFade: $appConfigStore.dynamicBackgroundTrailFade,
		particleSize: $appConfigStore.dynamicBackgroundParticleSize
	});

	// When dynamic background is active on the login page, temporarily swap
	// the accent color to one that matches the selected theme. Revert to the
	// admin-saved accentColor when dynamic bg is off or the component unmounts.
	$effect(() => {
		if (useDynamic) {
			const theme = getThemeByName($appConfigStore.dynamicBackgroundTheme);
			applyAccentColor(theme.accent);
		} else {
			applyAccentColor($appConfigStore.accentColor);
		}
	});

	onDestroy(() => {
		// Restore whatever the store says when leaving the login page.
		applyAccentColor($appConfigStore.accentColor);
	});
	let alternativeSignInButton = $state({
		href: '/login/alternative',
		label: m.alternative_sign_in_methods()
	});

	appConfigStore.subscribe((config) => {
		if (config.emailOneTimeAccessAsUnauthenticatedEnabled) {
			alternativeSignInButton.href = '/login/alternative';
			alternativeSignInButton.label = m.alternative_sign_in_methods();
		} else {
			alternativeSignInButton.href = '/login/alternative/code';
			alternativeSignInButton.label = m.sign_in_with_login_code();
		}

		if (page.url.pathname != '/login') {
			alternativeSignInButton.href = `${alternativeSignInButton.href}?redirect=${encodeURIComponent(page.url.pathname + page.url.search)}`;
		}
	});
</script>

{#if isDesktop.current}
	<div class="fixed inset-0" transition:fade={{ duration: 150 }}>
		<div class="h-screen items-center overflow-hidden text-center flex justify-center">
			<div
				class="flex h-full w-[650px] 2xl:w-[800px] p-16 transition-[width] duration-150 {cn(
					showAlternativeSignInMethodButton && 'pb-0'
				)}"
			>
				<div class="flex h-full w-full flex-col overflow-hidden">
					<div class="relative flex grow flex-col items-center justify-center overflow-auto p-1">
						{@render children()}
					</div>
					{#if showAlternativeSignInMethodButton}
						<div class="mb-4 flex items-center justify-center">
							<a
								href={alternativeSignInButton.href}
								class="text-muted-foreground text-xs transition-colors hover:underline"
							>
								{alternativeSignInButton.label}
							</a>
						</div>
					{/if}
				</div>
			</div>

			{#if useDynamic}
				<div class="m-6 flex h-[calc(100vh-3rem)] min-w-0 flex-1 overflow-hidden rounded-[40px]">
					<DynamicBackground
						config={dynamicConfig}
						mode={mode.current ?? 'dark'}
						class="h-full w-full"
						onfallback={() => (dynamicFailed = true)}
					/>
				</div>
			{:else if !imageError}
				<!-- Background image -->
				<div class="m-6 flex h-[calc(100vh-3rem)] overflow-hidden rounded-[40px]">
					<img
						src={backgroundImageUrl}
						class="h-full object-cover {cn(animate && 'animate-bg-zoom')}"
						alt={m.login_background()}
						onload={onBackgroundImageLoad}
						onerror={onBackgroundImageError}
					/>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="fixed inset-0" transition:fade={{ duration: 150 }}>
		{#if useDynamic}
			<div class="fixed inset-0 -z-10">
				<DynamicBackground
					config={dynamicConfig}
					mode={mode.current ?? 'dark'}
					class="h-full w-full"
					onfallback={() => (dynamicFailed = true)}
				/>
			</div>
		{/if}
		<div
			class="flex h-screen items-center justify-center bg-cover bg-center text-center"
			style={useDynamic ? '' : `background-image: url(${cachedBackgroundImage.getUrl()});`}
		>
			<Card.Root class="mx-3 w-full max-w-md">
				<Card.CardContent
					class="px-4 py-10 sm:p-10 {showAlternativeSignInMethodButton ? 'pb-3 sm:pb-3' : ''}"
				>
					{@render children()}
					{#if showAlternativeSignInMethodButton}
						<a
							href={alternativeSignInButton.href}
							class="text-muted-foreground mt-7 flex justify-center text-xs transition-colors hover:underline"
						>
							{alternativeSignInButton.label}
						</a>
					{/if}
				</Card.CardContent>
			</Card.Root>
		</div>
	</div>
{/if}
