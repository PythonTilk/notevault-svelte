
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/admin" | "/admin/analytics" | "/admin/announcements" | "/admin/audit-logs" | "/admin/dlp" | "/admin/secrets" | "/admin/settings" | "/admin/users" | "/admin/workspaces" | "/bots" | "/calendar" | "/calendar/auth-callback" | "/chat" | "/collections" | "/files" | "/login" | "/notes" | "/notes/[id]" | "/notes/[id]/edit" | "/notifications" | "/register" | "/search" | "/settings" | "/settings/integrations" | "/settings/integrations/webhooks" | "/settings/integrations/webhooks/new" | "/share" | "/workspaces" | "/workspaces/[id]";
		RouteParams(): {
			"/notes/[id]": { id: string };
			"/notes/[id]/edit": { id: string };
			"/workspaces/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/admin": Record<string, never>;
			"/admin/analytics": Record<string, never>;
			"/admin/announcements": Record<string, never>;
			"/admin/audit-logs": Record<string, never>;
			"/admin/dlp": Record<string, never>;
			"/admin/secrets": Record<string, never>;
			"/admin/settings": Record<string, never>;
			"/admin/users": Record<string, never>;
			"/admin/workspaces": Record<string, never>;
			"/bots": Record<string, never>;
			"/calendar": Record<string, never>;
			"/calendar/auth-callback": Record<string, never>;
			"/chat": Record<string, never>;
			"/collections": Record<string, never>;
			"/files": Record<string, never>;
			"/login": Record<string, never>;
			"/notes": { id?: string };
			"/notes/[id]": { id: string };
			"/notes/[id]/edit": { id: string };
			"/notifications": Record<string, never>;
			"/register": Record<string, never>;
			"/search": Record<string, never>;
			"/settings": Record<string, never>;
			"/settings/integrations": Record<string, never>;
			"/settings/integrations/webhooks": Record<string, never>;
			"/settings/integrations/webhooks/new": Record<string, never>;
			"/share": Record<string, never>;
			"/workspaces": { id?: string };
			"/workspaces/[id]": { id: string }
		};
		Pathname(): "/" | "/admin" | "/admin/" | "/admin/analytics" | "/admin/analytics/" | "/admin/announcements" | "/admin/announcements/" | "/admin/audit-logs" | "/admin/audit-logs/" | "/admin/dlp" | "/admin/dlp/" | "/admin/secrets" | "/admin/secrets/" | "/admin/settings" | "/admin/settings/" | "/admin/users" | "/admin/users/" | "/admin/workspaces" | "/admin/workspaces/" | "/bots" | "/bots/" | "/calendar" | "/calendar/" | "/calendar/auth-callback" | "/calendar/auth-callback/" | "/chat" | "/chat/" | "/collections" | "/collections/" | "/files" | "/files/" | "/login" | "/login/" | "/notes" | "/notes/" | `/notes/${string}` & {} | `/notes/${string}/` & {} | `/notes/${string}/edit` & {} | `/notes/${string}/edit/` & {} | "/notifications" | "/notifications/" | "/register" | "/register/" | "/search" | "/search/" | "/settings" | "/settings/" | "/settings/integrations" | "/settings/integrations/" | "/settings/integrations/webhooks" | "/settings/integrations/webhooks/" | "/settings/integrations/webhooks/new" | "/settings/integrations/webhooks/new/" | "/share" | "/share/" | "/workspaces" | "/workspaces/" | `/workspaces/${string}` & {} | `/workspaces/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/browserconfig.xml" | "/favicon.png" | "/manifest.json" | "/sw.js" | string & {};
	}
}