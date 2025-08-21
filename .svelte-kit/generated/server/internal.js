
import root from '../root.js';
import { set_building, set_prerendering } from '__sveltekit/environment';
import { set_assets } from '__sveltekit/paths';
import { set_manifest, set_read_implementation } from '__sveltekit/server';
import { set_private_env, set_public_env, set_safe_public_env } from '../../../node_modules/@sveltejs/kit/src/runtime/shared-server.js';

export const options = {
	app_template_contains_nonce: false,
	csp: {"mode":"auto","directives":{"upgrade-insecure-requests":false,"block-all-mixed-content":false},"reportOnly":{"upgrade-insecure-requests":false,"block-all-mixed-content":false}},
	csrf_check_origin: true,
	embedded: false,
	env_public_prefix: 'PUBLIC_',
	env_private_prefix: '',
	hash_routing: false,
	hooks: null, // added lazily, via `get_hooks`
	preload_strategy: "modulepreload",
	root,
	service_worker: false,
	templates: {
		app: ({ head, body, assets, nonce, env }) => "<!doctype html>\n<html lang=\"en\" class=\"dark\">\n\t<head>\n\t\t<meta charset=\"utf-8\" />\n\t\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\" />\n\t\t\n\t\t<!-- PWA Meta Tags -->\n\t\t<meta name=\"theme-color\" content=\"#6366f1\" />\n\t\t<meta name=\"background-color\" content=\"#0f0f23\" />\n\t\t<meta name=\"display\" content=\"standalone\" />\n\t\t<meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />\n\t\t<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\" />\n\t\t<meta name=\"apple-mobile-web-app-title\" content=\"NoteVault\" />\n\t\t<meta name=\"format-detection\" content=\"telephone=no\" />\n\t\t\n\t\t<!-- PWA Manifest -->\n\t\t<link rel=\"manifest\" href=\"/manifest.json\" />\n\t\t\n\t\t<!-- Icons -->\n\t\t<link rel=\"icon\" href=\"" + assets + "/favicon.png\" />\n\t\t<link rel=\"apple-touch-icon\" href=\"/icons/icon-192x192.png\" />\n\t\t<link rel=\"apple-touch-icon\" sizes=\"152x152\" href=\"/icons/icon-152x152.png\" />\n\t\t<link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/icons/icon-192x192.png\" />\n\t\t<link rel=\"apple-touch-icon\" sizes=\"167x167\" href=\"/icons/icon-192x192.png\" />\n\t\t\n\t\t<!-- Microsoft Tiles -->\n\t\t<meta name=\"msapplication-TileImage\" content=\"/icons/icon-144x144.png\" />\n\t\t<meta name=\"msapplication-TileColor\" content=\"#6366f1\" />\n\t\t<meta name=\"msapplication-config\" content=\"/browserconfig.xml\" />\n\t\t\n\t\t<!-- Security -->\n\t\t<meta http-equiv=\"X-Content-Type-Options\" content=\"nosniff\" />\n\t\t<meta http-equiv=\"X-Frame-Options\" content=\"DENY\" />\n\t\t<meta http-equiv=\"X-XSS-Protection\" content=\"1; mode=block\" />\n\t\t<meta name=\"referrer\" content=\"strict-origin-when-cross-origin\" />\n\t\t\n\t\t<!-- SEO -->\n\t\t<meta name=\"description\" content=\"Secure collaborative note-taking and workspace management platform\" />\n\t\t<meta name=\"keywords\" content=\"notes, productivity, collaboration, workspace, secure\" />\n\t\t<meta name=\"author\" content=\"NoteVault\" />\n\t\t\n\t\t<!-- Open Graph -->\n\t\t<meta property=\"og:title\" content=\"NoteVault\" />\n\t\t<meta property=\"og:description\" content=\"Secure collaborative note-taking and workspace management\" />\n\t\t<meta property=\"og:type\" content=\"website\" />\n\t\t<meta property=\"og:image\" content=\"/icons/icon-512x512.png\" />\n\t\t\n\t\t<!-- Twitter Card -->\n\t\t<meta name=\"twitter:card\" content=\"summary_large_image\" />\n\t\t<meta name=\"twitter:title\" content=\"NoteVault\" />\n\t\t<meta name=\"twitter:description\" content=\"Secure collaborative note-taking and workspace management\" />\n\t\t<meta name=\"twitter:image\" content=\"/icons/icon-512x512.png\" />\n\t\t\n\t\t<!-- Fonts -->\n\t\t<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n\t\t<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n\t\t<link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap\" rel=\"stylesheet\">\n\t\t\n\t\t" + head + "\n\t</head>\n\t<body data-sveltekit-preload-data=\"hover\" class=\"bg-dark-950 text-white\">\n\t\t<div style=\"display: contents\">" + body + "</div>\n\t\t\n\t\t<!-- PWA Install Banner -->\n\t\t<div id=\"pwa-install-banner\" style=\"display: none;\" class=\"fixed bottom-4 left-4 right-4 bg-primary-600 text-white p-4 rounded-lg shadow-lg z-50\">\n\t\t\t<div class=\"flex items-center justify-between\">\n\t\t\t\t<div>\n\t\t\t\t\t<h3 class=\"font-semibold\">Install NoteVault</h3>\n\t\t\t\t\t<p class=\"text-sm opacity-90\">Get the full app experience with offline access</p>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"flex space-x-2\">\n\t\t\t\t\t<button id=\"pwa-install-dismiss\" class=\"text-white/80 hover:text-white\">\n\t\t\t\t\t\t<svg class=\"w-5 h-5\" fill=\"currentColor\" viewBox=\"0 0 20 20\">\n\t\t\t\t\t\t\t<path fill-rule=\"evenodd\" d=\"M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z\" clip-rule=\"evenodd\"></path>\n\t\t\t\t\t\t</svg>\n\t\t\t\t\t</button>\n\t\t\t\t\t<button id=\"pwa-install-button\" class=\"bg-white text-primary-600 px-4 py-2 rounded font-medium\">\n\t\t\t\t\t\tInstall\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t\t\n\t\t<!-- Offline Indicator -->\n\t\t<div id=\"offline-indicator\" style=\"display: none;\" class=\"fixed top-4 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50\">\n\t\t\t<div class=\"flex items-center space-x-2\">\n\t\t\t\t<svg class=\"w-4 h-4\" fill=\"currentColor\" viewBox=\"0 0 20 20\">\n\t\t\t\t\t<path fill-rule=\"evenodd\" d=\"M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z\" clip-rule=\"evenodd\"></path>\n\t\t\t\t</svg>\n\t\t\t\t<span>You're offline. Some features may be limited.</span>\n\t\t\t</div>\n\t\t</div>\n\t\t\n\t\t<!-- Update Available Notification -->\n\t\t<div id=\"update-available\" style=\"display: none;\" class=\"fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50\">\n\t\t\t<div class=\"flex items-center justify-between\">\n\t\t\t\t<div>\n\t\t\t\t\t<h3 class=\"font-semibold\">Update Available</h3>\n\t\t\t\t\t<p class=\"text-sm opacity-90\">A new version is ready to install</p>\n\t\t\t\t</div>\n\t\t\t\t<button id=\"update-button\" class=\"bg-white text-green-600 px-4 py-2 rounded font-medium ml-4\">\n\t\t\t\t\tUpdate\n\t\t\t\t</button>\n\t\t\t</div>\n\t\t</div>\n\t</body>\n</html>",
		error: ({ status, message }) => "<!doctype html>\n<html lang=\"en\">\n\t<head>\n\t\t<meta charset=\"utf-8\" />\n\t\t<title>" + message + "</title>\n\n\t\t<style>\n\t\t\tbody {\n\t\t\t\t--bg: white;\n\t\t\t\t--fg: #222;\n\t\t\t\t--divider: #ccc;\n\t\t\t\tbackground: var(--bg);\n\t\t\t\tcolor: var(--fg);\n\t\t\t\tfont-family:\n\t\t\t\t\tsystem-ui,\n\t\t\t\t\t-apple-system,\n\t\t\t\t\tBlinkMacSystemFont,\n\t\t\t\t\t'Segoe UI',\n\t\t\t\t\tRoboto,\n\t\t\t\t\tOxygen,\n\t\t\t\t\tUbuntu,\n\t\t\t\t\tCantarell,\n\t\t\t\t\t'Open Sans',\n\t\t\t\t\t'Helvetica Neue',\n\t\t\t\t\tsans-serif;\n\t\t\t\tdisplay: flex;\n\t\t\t\talign-items: center;\n\t\t\t\tjustify-content: center;\n\t\t\t\theight: 100vh;\n\t\t\t\tmargin: 0;\n\t\t\t}\n\n\t\t\t.error {\n\t\t\t\tdisplay: flex;\n\t\t\t\talign-items: center;\n\t\t\t\tmax-width: 32rem;\n\t\t\t\tmargin: 0 1rem;\n\t\t\t}\n\n\t\t\t.status {\n\t\t\t\tfont-weight: 200;\n\t\t\t\tfont-size: 3rem;\n\t\t\t\tline-height: 1;\n\t\t\t\tposition: relative;\n\t\t\t\ttop: -0.05rem;\n\t\t\t}\n\n\t\t\t.message {\n\t\t\t\tborder-left: 1px solid var(--divider);\n\t\t\t\tpadding: 0 0 0 1rem;\n\t\t\t\tmargin: 0 0 0 1rem;\n\t\t\t\tmin-height: 2.5rem;\n\t\t\t\tdisplay: flex;\n\t\t\t\talign-items: center;\n\t\t\t}\n\n\t\t\t.message h1 {\n\t\t\t\tfont-weight: 400;\n\t\t\t\tfont-size: 1em;\n\t\t\t\tmargin: 0;\n\t\t\t}\n\n\t\t\t@media (prefers-color-scheme: dark) {\n\t\t\t\tbody {\n\t\t\t\t\t--bg: #222;\n\t\t\t\t\t--fg: #ddd;\n\t\t\t\t\t--divider: #666;\n\t\t\t\t}\n\t\t\t}\n\t\t</style>\n\t</head>\n\t<body>\n\t\t<div class=\"error\">\n\t\t\t<span class=\"status\">" + status + "</span>\n\t\t\t<div class=\"message\">\n\t\t\t\t<h1>" + message + "</h1>\n\t\t\t</div>\n\t\t</div>\n\t</body>\n</html>\n"
	},
	version_hash: "je5xi6"
};

export async function get_hooks() {
	let handle;
	let handleFetch;
	let handleError;
	let handleValidationError;
	let init;
	

	let reroute;
	let transport;
	

	return {
		handle,
		handleFetch,
		handleError,
		handleValidationError,
		init,
		reroute,
		transport
	};
}

export { set_assets, set_building, set_manifest, set_prerendering, set_private_env, set_public_env, set_read_implementation, set_safe_public_env };
