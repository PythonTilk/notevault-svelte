export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26')
];

export const server_loads = [];

export const dictionary = {
		"/": [2],
		"/admin": [3],
		"/admin/analytics": [4],
		"/admin/announcements": [5],
		"/admin/audit-logs": [6],
		"/admin/dlp": [7],
		"/admin/secrets": [8],
		"/admin/settings": [9],
		"/admin/users": [10],
		"/admin/workspaces": [11],
		"/bots": [12],
		"/calendar": [13],
		"/calendar/auth-callback": [14],
		"/chat": [15],
		"/files": [16],
		"/login": [17],
		"/notifications": [18],
		"/register": [19],
		"/search": [20],
		"/settings": [21],
		"/settings/integrations": [22],
		"/settings/integrations/webhooks": [23],
		"/settings/integrations/webhooks/new": [24],
		"/share": [25],
		"/workspaces/[id]": [26]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';