
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
	export const NODE_ENV: string;
	export const DOMAIN: string;
	export const FRONTEND_URL: string;
	export const BACKEND_URL: string;
	export const DB_PASSWORD: string;
	export const REDIS_PASSWORD: string;
	export const JWT_SECRET: string;
	export const SESSION_SECRET: string;
	export const CSRF_SECRET: string;
	export const SMTP_HOST: string;
	export const SMTP_PORT: string;
	export const SMTP_SECURE: string;
	export const SMTP_USER: string;
	export const SMTP_PASS: string;
	export const FROM_EMAIL: string;
	export const FROM_NAME: string;
	export const STORAGE_TYPE: string;
	export const AWS_ACCESS_KEY_ID: string;
	export const AWS_SECRET_ACCESS_KEY: string;
	export const AWS_REGION: string;
	export const AWS_S3_BUCKET: string;
	export const GOOGLE_CLIENT_ID: string;
	export const GOOGLE_CLIENT_SECRET: string;
	export const GITHUB_CLIENT_ID: string;
	export const GITHUB_CLIENT_SECRET: string;
	export const DISCORD_CLIENT_ID: string;
	export const DISCORD_CLIENT_SECRET: string;
	export const SLACK_BOT_TOKEN: string;
	export const SLACK_SIGNING_SECRET: string;
	export const SLACK_WEBHOOK_URL: string;
	export const DISCORD_BOT_TOKEN: string;
	export const DISCORD_WEBHOOK_URL: string;
	export const GOOGLE_CALENDAR_ENABLED: string;
	export const OUTLOOK_CLIENT_ID: string;
	export const OUTLOOK_CLIENT_SECRET: string;
	export const GOOGLE_DRIVE_ENABLED: string;
	export const DROPBOX_CLIENT_ID: string;
	export const DROPBOX_CLIENT_SECRET: string;
	export const GITHUB_INTEGRATION_ENABLED: string;
	export const GITHUB_WEBHOOK_SECRET: string;
	export const GITLAB_CLIENT_ID: string;
	export const GITLAB_CLIENT_SECRET: string;
	export const WEBHOOKS_ENABLED: string;
	export const PROMETHEUS_ENABLED: string;
	export const GRAFANA_USER: string;
	export const GRAFANA_PASSWORD: string;
	export const SENTRY_DSN: string;
	export const BACKUP_RETENTION_DAYS: string;
	export const BACKUP_SCHEDULE: string;
	export const BACKUP_S3_BUCKET: string;
	export const SSL_EMAIL: string;
	export const SHELL: string;
	export const npm_command: string;
	export const npm_config_userconfig: string;
	export const COLORTERM: string;
	export const HYPRLAND_CMD: string;
	export const npm_config_cache: string;
	export const XDG_SESSION_PATH: string;
	export const XDG_MENU_PREFIX: string;
	export const GLFW_IM_MODULE: string;
	export const XDG_BACKEND: string;
	export const NODE: string;
	export const LC_ADDRESS: string;
	export const ILLOGICAL_IMPULSE_VIRTUAL_ENV: string;
	export const LC_NAME: string;
	export const INPUT_METHOD: string;
	export const COLOR: string;
	export const npm_config_local_prefix: string;
	export const XMODIFIERS: string;
	export const DESKTOP_SESSION: string;
	export const LC_MONETARY: string;
	export const ELECTRON_OZONE_PLATFORM_HINT: string;
	export const KITTY_PID: string;
	export const npm_config_globalconfig: string;
	export const EDITOR: string;
	export const XDG_SEAT: string;
	export const PWD: string;
	export const XDG_SESSION_DESKTOP: string;
	export const LOGNAME: string;
	export const QT_QPA_PLATFORMTHEME: string;
	export const XDG_SESSION_TYPE: string;
	export const npm_config_init_module: string;
	export const _: string;
	export const KITTY_PUBLIC_KEY: string;
	export const TERMINAL: string;
	export const MOTD_SHOWN: string;
	export const HOME: string;
	export const LANG: string;
	export const LC_PAPER: string;
	export const _JAVA_AWT_WM_NONREPARENTING: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const npm_package_version: string;
	export const STARSHIP_SHELL: string;
	export const WAYLAND_DISPLAY: string;
	export const KITTY_WINDOW_ID: string;
	export const FORCE_COLOR: string;
	export const XDG_SEAT_PATH: string;
	export const INIT_CWD: string;
	export const STARSHIP_SESSION_KEY: string;
	export const QT_QPA_PLATFORM: string;
	export const npm_lifecycle_script: string;
	export const SDL_IM_MODULE: string;
	export const npm_config_npm_version: string;
	export const XDG_SESSION_CLASS: string;
	export const TERMINFO: string;
	export const LC_IDENTIFICATION: string;
	export const TERM: string;
	export const npm_package_name: string;
	export const npm_config_prefix: string;
	export const USER: string;
	export const HYPRLAND_INSTANCE_SIGNATURE: string;
	export const DISPLAY: string;
	export const npm_lifecycle_event: string;
	export const GSK_RENDERER: string;
	export const SHLVL: string;
	export const MOZ_ENABLE_WAYLAND: string;
	export const LC_TELEPHONE: string;
	export const QT_IM_MODULE: string;
	export const LC_MEASUREMENT: string;
	export const XDG_VTNR: string;
	export const XDG_SESSION_ID: string;
	export const npm_config_user_agent: string;
	export const npm_execpath: string;
	export const XDG_RUNTIME_DIR: string;
	export const DEBUGINFOD_URLS: string;
	export const npm_package_json: string;
	export const LC_TIME: string;
	export const npm_config_noproxy: string;
	export const BROWSER: string;
	export const PATH: string;
	export const npm_config_node_gyp: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const npm_config_global_prefix: string;
	export const MAIL: string;
	export const KITTY_INSTALLATION_DIR: string;
	export const npm_node_execpath: string;
	export const LC_NUMERIC: string;
	export const VITE_USER_NODE_ENV: string;
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
		NODE_ENV: string;
		DOMAIN: string;
		FRONTEND_URL: string;
		BACKEND_URL: string;
		DB_PASSWORD: string;
		REDIS_PASSWORD: string;
		JWT_SECRET: string;
		SESSION_SECRET: string;
		CSRF_SECRET: string;
		SMTP_HOST: string;
		SMTP_PORT: string;
		SMTP_SECURE: string;
		SMTP_USER: string;
		SMTP_PASS: string;
		FROM_EMAIL: string;
		FROM_NAME: string;
		STORAGE_TYPE: string;
		AWS_ACCESS_KEY_ID: string;
		AWS_SECRET_ACCESS_KEY: string;
		AWS_REGION: string;
		AWS_S3_BUCKET: string;
		GOOGLE_CLIENT_ID: string;
		GOOGLE_CLIENT_SECRET: string;
		GITHUB_CLIENT_ID: string;
		GITHUB_CLIENT_SECRET: string;
		DISCORD_CLIENT_ID: string;
		DISCORD_CLIENT_SECRET: string;
		SLACK_BOT_TOKEN: string;
		SLACK_SIGNING_SECRET: string;
		SLACK_WEBHOOK_URL: string;
		DISCORD_BOT_TOKEN: string;
		DISCORD_WEBHOOK_URL: string;
		GOOGLE_CALENDAR_ENABLED: string;
		OUTLOOK_CLIENT_ID: string;
		OUTLOOK_CLIENT_SECRET: string;
		GOOGLE_DRIVE_ENABLED: string;
		DROPBOX_CLIENT_ID: string;
		DROPBOX_CLIENT_SECRET: string;
		GITHUB_INTEGRATION_ENABLED: string;
		GITHUB_WEBHOOK_SECRET: string;
		GITLAB_CLIENT_ID: string;
		GITLAB_CLIENT_SECRET: string;
		WEBHOOKS_ENABLED: string;
		PROMETHEUS_ENABLED: string;
		GRAFANA_USER: string;
		GRAFANA_PASSWORD: string;
		SENTRY_DSN: string;
		BACKUP_RETENTION_DAYS: string;
		BACKUP_SCHEDULE: string;
		BACKUP_S3_BUCKET: string;
		SSL_EMAIL: string;
		SHELL: string;
		npm_command: string;
		npm_config_userconfig: string;
		COLORTERM: string;
		HYPRLAND_CMD: string;
		npm_config_cache: string;
		XDG_SESSION_PATH: string;
		XDG_MENU_PREFIX: string;
		GLFW_IM_MODULE: string;
		XDG_BACKEND: string;
		NODE: string;
		LC_ADDRESS: string;
		ILLOGICAL_IMPULSE_VIRTUAL_ENV: string;
		LC_NAME: string;
		INPUT_METHOD: string;
		COLOR: string;
		npm_config_local_prefix: string;
		XMODIFIERS: string;
		DESKTOP_SESSION: string;
		LC_MONETARY: string;
		ELECTRON_OZONE_PLATFORM_HINT: string;
		KITTY_PID: string;
		npm_config_globalconfig: string;
		EDITOR: string;
		XDG_SEAT: string;
		PWD: string;
		XDG_SESSION_DESKTOP: string;
		LOGNAME: string;
		QT_QPA_PLATFORMTHEME: string;
		XDG_SESSION_TYPE: string;
		npm_config_init_module: string;
		_: string;
		KITTY_PUBLIC_KEY: string;
		TERMINAL: string;
		MOTD_SHOWN: string;
		HOME: string;
		LANG: string;
		LC_PAPER: string;
		_JAVA_AWT_WM_NONREPARENTING: string;
		XDG_CURRENT_DESKTOP: string;
		npm_package_version: string;
		STARSHIP_SHELL: string;
		WAYLAND_DISPLAY: string;
		KITTY_WINDOW_ID: string;
		FORCE_COLOR: string;
		XDG_SEAT_PATH: string;
		INIT_CWD: string;
		STARSHIP_SESSION_KEY: string;
		QT_QPA_PLATFORM: string;
		npm_lifecycle_script: string;
		SDL_IM_MODULE: string;
		npm_config_npm_version: string;
		XDG_SESSION_CLASS: string;
		TERMINFO: string;
		LC_IDENTIFICATION: string;
		TERM: string;
		npm_package_name: string;
		npm_config_prefix: string;
		USER: string;
		HYPRLAND_INSTANCE_SIGNATURE: string;
		DISPLAY: string;
		npm_lifecycle_event: string;
		GSK_RENDERER: string;
		SHLVL: string;
		MOZ_ENABLE_WAYLAND: string;
		LC_TELEPHONE: string;
		QT_IM_MODULE: string;
		LC_MEASUREMENT: string;
		XDG_VTNR: string;
		XDG_SESSION_ID: string;
		npm_config_user_agent: string;
		npm_execpath: string;
		XDG_RUNTIME_DIR: string;
		DEBUGINFOD_URLS: string;
		npm_package_json: string;
		LC_TIME: string;
		npm_config_noproxy: string;
		BROWSER: string;
		PATH: string;
		npm_config_node_gyp: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		npm_config_global_prefix: string;
		MAIL: string;
		KITTY_INSTALLATION_DIR: string;
		npm_node_execpath: string;
		LC_NUMERIC: string;
		VITE_USER_NODE_ENV: string;
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
