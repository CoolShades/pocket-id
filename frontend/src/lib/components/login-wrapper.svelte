<script module lang="ts">
	let backgroundImageExists = $state<boolean | undefined>(undefined);
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

	let isInitialLoad = $state(false);
	let animate = $derived(isInitialLoad && !$appConfigStore.disableAnimations);

	onMount(async () => {
		fetch(cachedBackgroundImage.getUrl(), {
			method: 'HEAD'
		})
			.then(async (res) => (backgroundImageExists = res.ok))
			.catch(() => (backgroundImageExists = false));
	});

	afterNavigate((e) => {
		isInitialLoad = !e?.from?.url;
	});

	const isDesktop = new MediaQuery('(min-width: 1024px)');

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

	// "Background visible" = dynamic is active OR the static background image exists.
	// Drives the side-by-side desktop layout and the transparent-card mobile fallback.
	let hasVisibleBackground = $derived(useDynamic || backgroundImageExists === true);

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

{#if !useDynamic && backgroundImageExists === undefined}
	<div class="bg-background h-screen"></div>
{:else if isDesktop.current}
	<div
		in:fade={{ duration: 150 }}
		class="relative flex h-screen w-full items-center overflow-hidden text-center {hasVisibleBackground
			? 'justify-start'
			: 'justify-center'}"
	>
		<div
			class="relative z-10 flex h-full p-16 {cn(
				showAlternativeSignInMethodButton && 'pb-0',
				hasVisibleBackground && 'w-full max-w-[650px] 2xl:max-w-[800px]'
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
			<div
				class="absolute top-0 right-0 bottom-0 left-[650px] z-0 m-6 overflow-hidden rounded-[40px] 2xl:left-[800px]"
			>
				<DynamicBackground
					config={dynamicConfig}
					mode={mode.current ?? 'dark'}
					class="h-full w-full"
					onfallback={() => (dynamicFailed = true)}
				/>
			</div>
		{:else if backgroundImageExists}
			<!-- Background image -->
			<div
				class="absolute top-0 right-0 bottom-0 left-[650px] z-0 m-6 overflow-hidden rounded-[40px] 2xl:left-[800px]"
			>
				<img
					src={cachedBackgroundImage.getUrl()}
					class="{cn(
						animate && 'animate-bg-zoom'
					)} h-screen w-[calc(100vw-650px)] object-cover 2xl:w-[calc(100vw-800px)]"
					alt={m.login_background()}
				/>
			</div>
		{/if}
	</div>
{:else}
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
		style={!useDynamic && backgroundImageExists
			? `background-image: url(${cachedBackgroundImage.getUrl()});`
			: ''}
	>
		<Card.Root
			class={{
				'mx-3 w-full max-w-md': true,
				'bg-transparent border-0': !useDynamic && !backgroundImageExists
			}}
		>
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
{/if}
