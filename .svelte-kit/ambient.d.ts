
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const GITHUB_TOKEN: string;
	export const TMUX: string;
	export const POETRY_VIRTUALENVS_PATH: string;
	export const MAIL: string;
	export const npm_config_user_agent: string;
	export const GIT_EDITOR: string;
	export const HOSTNAME: string;
	export const OPENVSCODE_SERVER_ROOT: string;
	export const npm_node_execpath: string;
	export const SHLVL: string;
	export const npm_config_noproxy: string;
	export const HOME: string;
	export const CONDA_SHLVL: string;
	export const github_token: string;
	export const OLDPWD: string;
	export const TERM_PROGRAM_VERSION: string;
	export const npm_package_json: string;
	export const PYTHONUNBUFFERED: string;
	export const GPG_KEY: string;
	export const PS1: string;
	export const POETRY_HOME: string;
	export const npm_config_userconfig: string;
	export const npm_config_local_prefix: string;
	export const PS2: string;
	export const PYTHON_SHA256: string;
	export const VISUAL: string;
	export const COLOR: string;
	export const _: string;
	export const npm_config_prefix: string;
	export const npm_config_npm_version: string;
	export const PIP_BREAK_SYSTEM_PACKAGES: string;
	export const TERM: string;
	export const npm_config_cache: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const NODE: string;
	export const npm_package_name: string;
	export const port: string;
	export const MAMBA_ROOT_PREFIX: string;
	export const SDL_AUDIODRIVER: string;
	export const TIKTOKEN_CACHE_DIR: string;
	export const LANG: string;
	export const VSCODE_PORT: string;
	export const TERM_PROGRAM: string;
	export const npm_lifecycle_script: string;
	export const GSETTINGS_SCHEMA_DIR: string;
	export const SHELL: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const PYTHON_VERSION: string;
	export const PROMPT_COMMAND: string;
	export const OH_INTERPRETER_PATH: string;
	export const CONDA_DEFAULT_ENV: string;
	export const MAMBA_EXE: string;
	export const VIRTUAL_ENV: string;
	export const npm_config_globalconfig: string;
	export const npm_config_init_module: string;
	export const PWD: string;
	export const LC_ALL: string;
	export const npm_execpath: string;
	export const npm_config_global_prefix: string;
	export const APP_PORT_1: string;
	export const npm_command: string;
	export const APP_PORT_2: string;
	export const CONDA_PREFIX: string;
	export const GSETTINGS_SCHEMA_DIR_CONDA_BACKUP: string;
	export const TMUX_PANE: string;
	export const EDITOR: string;
	export const PYGAME_HIDE_SUPPORT_PROMPT: string;
	export const INIT_CWD: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		GITHUB_TOKEN: string;
		TMUX: string;
		POETRY_VIRTUALENVS_PATH: string;
		MAIL: string;
		npm_config_user_agent: string;
		GIT_EDITOR: string;
		HOSTNAME: string;
		OPENVSCODE_SERVER_ROOT: string;
		npm_node_execpath: string;
		SHLVL: string;
		npm_config_noproxy: string;
		HOME: string;
		CONDA_SHLVL: string;
		github_token: string;
		OLDPWD: string;
		TERM_PROGRAM_VERSION: string;
		npm_package_json: string;
		PYTHONUNBUFFERED: string;
		GPG_KEY: string;
		PS1: string;
		POETRY_HOME: string;
		npm_config_userconfig: string;
		npm_config_local_prefix: string;
		PS2: string;
		PYTHON_SHA256: string;
		VISUAL: string;
		COLOR: string;
		_: string;
		npm_config_prefix: string;
		npm_config_npm_version: string;
		PIP_BREAK_SYSTEM_PACKAGES: string;
		TERM: string;
		npm_config_cache: string;
		npm_config_node_gyp: string;
		PATH: string;
		NODE: string;
		npm_package_name: string;
		port: string;
		MAMBA_ROOT_PREFIX: string;
		SDL_AUDIODRIVER: string;
		TIKTOKEN_CACHE_DIR: string;
		LANG: string;
		VSCODE_PORT: string;
		TERM_PROGRAM: string;
		npm_lifecycle_script: string;
		GSETTINGS_SCHEMA_DIR: string;
		SHELL: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		PYTHON_VERSION: string;
		PROMPT_COMMAND: string;
		OH_INTERPRETER_PATH: string;
		CONDA_DEFAULT_ENV: string;
		MAMBA_EXE: string;
		VIRTUAL_ENV: string;
		npm_config_globalconfig: string;
		npm_config_init_module: string;
		PWD: string;
		LC_ALL: string;
		npm_execpath: string;
		npm_config_global_prefix: string;
		APP_PORT_1: string;
		npm_command: string;
		APP_PORT_2: string;
		CONDA_PREFIX: string;
		GSETTINGS_SCHEMA_DIR_CONDA_BACKUP: string;
		TMUX_PANE: string;
		EDITOR: string;
		PYGAME_HIDE_SUPPORT_PROMPT: string;
		INIT_CWD: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
