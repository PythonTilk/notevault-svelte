
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
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const WORKSPACE_BASE: string;
	export const GITHUB_TOKEN: string;
	export const KUBERNETES_SERVICE_PORT: string;
	export const TMUX: string;
	export const POETRY_VIRTUALENVS_PATH: string;
	export const KUBERNETES_PORT: string;
	export const MAIL: string;
	export const SERVE_FRONTEND: string;
	export const USER: string;
	export const npm_config_user_agent: string;
	export const GIT_EDITOR: string;
	export const PERMITTED_CORS_ORIGINS: string;
	export const HOSTNAME: string;
	export const OPENVSCODE_SERVER_ROOT: string;
	export const npm_node_execpath: string;
	export const SHLVL: string;
	export const ALLOW_SET_CONVERSATION_ID: string;
	export const npm_config_noproxy: string;
	export const HOME: string;
	export const CONDA_SHLVL: string;
	export const INIT_GIT_IN_EMPTY_WORKSPACE: string;
	export const OLDPWD: string;
	export const TERM_PROGRAM_VERSION: string;
	export const OPENHANDS_REPO_PATH: string;
	export const npm_package_json: string;
	export const GPG_KEY: string;
	export const PS1: string;
	export const POETRY_HOME: string;
	export const npm_config_userconfig: string;
	export const npm_config_local_prefix: string;
	export const PS2: string;
	export const PYTHON_SHA256: string;
	export const VISUAL: string;
	export const COLOR: string;
	export const RUNTIME_URL: string;
	export const _: string;
	export const npm_config_prefix: string;
	export const npm_config_npm_version: string;
	export const SANDBOX_CLOSE_DELAY: string;
	export const WORK_PORT_1: string;
	export const LOG_JSON: string;
	export const TERM: string;
	export const WORK_PORT_2: string;
	export const npm_config_cache: string;
	export const KUBERNETES_PORT_443_TCP_ADDR: string;
	export const WORKSPACE_MOUNT_PATH_IN_SANDBOX: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const SESSION_API_KEY: string;
	export const NODE: string;
	export const npm_package_name: string;
	export const port: string;
	export const OR_SITE_URL: string;
	export const KUBERNETES_PORT_443_TCP_PORT: string;
	export const MAMBA_ROOT_PREFIX: string;
	export const OR_APP_NAME: string;
	export const SDL_AUDIODRIVER: string;
	export const KUBERNETES_PORT_443_TCP_PROTO: string;
	export const TIKTOKEN_CACHE_DIR: string;
	export const LANG: string;
	export const FILE_STORE_WEB_HOOK_BATCH: string;
	export const CONVERSATION_MANAGER_CLASS: string;
	export const VSCODE_PORT: string;
	export const TERM_PROGRAM: string;
	export const npm_lifecycle_script: string;
	export const GSETTINGS_SCHEMA_DIR: string;
	export const SHELL: string;
	export const RUNTIME: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const PYTHON_VERSION: string;
	export const SKIP_DEPENDENCY_CHECK: string;
	export const PROMPT_COMMAND: string;
	export const OH_INTERPRETER_PATH: string;
	export const CONDA_DEFAULT_ENV: string;
	export const FILE_STORE_WEB_HOOK_URL: string;
	export const KUBERNETES_SERVICE_PORT_HTTPS: string;
	export const KUBERNETES_PORT_443_TCP: string;
	export const MAMBA_EXE: string;
	export const VIRTUAL_ENV: string;
	export const npm_config_globalconfig: string;
	export const npm_config_init_module: string;
	export const PWD: string;
	export const KUBERNETES_SERVICE_HOST: string;
	export const LC_ALL: string;
	export const npm_execpath: string;
	export const FILE_STORE_PATH: string;
	export const npm_config_global_prefix: string;
	export const PYTHONPATH: string;
	export const npm_command: string;
	export const CONDA_PREFIX: string;
	export const GSETTINGS_SCHEMA_DIR_CONDA_BACKUP: string;
	export const LOCAL_RUNTIME_MODE: string;
	export const LOG_JSON_LEVEL_KEY: string;
	export const TMUX_PANE: string;
	export const EDITOR: string;
	export const WEB_HOST: string;
	export const INITIAL_NUM_WARM_SERVERS: string;
	export const PYGAME_HIDE_SUPPORT_PROMPT: string;
	export const INIT_CWD: string;
	export const TEST: string;
	export const VITEST: string;
	export const NODE_ENV: string;
	export const PROD: string;
	export const DEV: string;
	export const BASE_URL: string;
	export const MODE: string;
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
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		WORKSPACE_BASE: string;
		GITHUB_TOKEN: string;
		KUBERNETES_SERVICE_PORT: string;
		TMUX: string;
		POETRY_VIRTUALENVS_PATH: string;
		KUBERNETES_PORT: string;
		MAIL: string;
		SERVE_FRONTEND: string;
		USER: string;
		npm_config_user_agent: string;
		GIT_EDITOR: string;
		PERMITTED_CORS_ORIGINS: string;
		HOSTNAME: string;
		OPENVSCODE_SERVER_ROOT: string;
		npm_node_execpath: string;
		SHLVL: string;
		ALLOW_SET_CONVERSATION_ID: string;
		npm_config_noproxy: string;
		HOME: string;
		CONDA_SHLVL: string;
		INIT_GIT_IN_EMPTY_WORKSPACE: string;
		OLDPWD: string;
		TERM_PROGRAM_VERSION: string;
		OPENHANDS_REPO_PATH: string;
		npm_package_json: string;
		GPG_KEY: string;
		PS1: string;
		POETRY_HOME: string;
		npm_config_userconfig: string;
		npm_config_local_prefix: string;
		PS2: string;
		PYTHON_SHA256: string;
		VISUAL: string;
		COLOR: string;
		RUNTIME_URL: string;
		_: string;
		npm_config_prefix: string;
		npm_config_npm_version: string;
		SANDBOX_CLOSE_DELAY: string;
		WORK_PORT_1: string;
		LOG_JSON: string;
		TERM: string;
		WORK_PORT_2: string;
		npm_config_cache: string;
		KUBERNETES_PORT_443_TCP_ADDR: string;
		WORKSPACE_MOUNT_PATH_IN_SANDBOX: string;
		npm_config_node_gyp: string;
		PATH: string;
		SESSION_API_KEY: string;
		NODE: string;
		npm_package_name: string;
		port: string;
		OR_SITE_URL: string;
		KUBERNETES_PORT_443_TCP_PORT: string;
		MAMBA_ROOT_PREFIX: string;
		OR_APP_NAME: string;
		SDL_AUDIODRIVER: string;
		KUBERNETES_PORT_443_TCP_PROTO: string;
		TIKTOKEN_CACHE_DIR: string;
		LANG: string;
		FILE_STORE_WEB_HOOK_BATCH: string;
		CONVERSATION_MANAGER_CLASS: string;
		VSCODE_PORT: string;
		TERM_PROGRAM: string;
		npm_lifecycle_script: string;
		GSETTINGS_SCHEMA_DIR: string;
		SHELL: string;
		RUNTIME: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		PYTHON_VERSION: string;
		SKIP_DEPENDENCY_CHECK: string;
		PROMPT_COMMAND: string;
		OH_INTERPRETER_PATH: string;
		CONDA_DEFAULT_ENV: string;
		FILE_STORE_WEB_HOOK_URL: string;
		KUBERNETES_SERVICE_PORT_HTTPS: string;
		KUBERNETES_PORT_443_TCP: string;
		MAMBA_EXE: string;
		VIRTUAL_ENV: string;
		npm_config_globalconfig: string;
		npm_config_init_module: string;
		PWD: string;
		KUBERNETES_SERVICE_HOST: string;
		LC_ALL: string;
		npm_execpath: string;
		FILE_STORE_PATH: string;
		npm_config_global_prefix: string;
		PYTHONPATH: string;
		npm_command: string;
		CONDA_PREFIX: string;
		GSETTINGS_SCHEMA_DIR_CONDA_BACKUP: string;
		LOCAL_RUNTIME_MODE: string;
		LOG_JSON_LEVEL_KEY: string;
		TMUX_PANE: string;
		EDITOR: string;
		WEB_HOST: string;
		INITIAL_NUM_WARM_SERVERS: string;
		PYGAME_HIDE_SUPPORT_PROMPT: string;
		INIT_CWD: string;
		TEST: string;
		VITEST: string;
		NODE_ENV: string;
		PROD: string;
		DEV: string;
		BASE_URL: string;
		MODE: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
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
