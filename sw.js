const CACHE_VERSION = "codepad-pwa-v1.0.96-20260612-6";
const APP_SHELL = [
  "/",
  "/index.html",
  "/diagnostics.html",
  "/manifest.webmanifest",
  "/src/html/app.html",
  "/src/html/runtime.html",
  "/src/css/gfonts.css",
  "/src/css/main.css",
  "/src/css/runtime.css",
  "/src/js/pwa/chrome-compat.js",
  "/src/js/pwa/register.js",
  "/src/js/runtime-config.js",
  "/src/js/runtime.js",
  "/src/js/pyodide-worker.js",
  "/src/js/handlers/files.js",
  "/src/js/handlers/notifications.js",
  "/src/js/handlers/ide.settings.js",
  "/src/js/handlers/sidebar.js",
  "/src/js/handlers/editors.js",
  "/src/js/handlers/modals.js",
  "/src/js/handlers/classroom.js",
  "/src/js/events.js",
  "/src/html/templates/py.tpl",
  "/runtime/python/turtle.py",
  "/vendor/pyodide/package.json",
  "/vendor/pyodide/pyodide-lock.json",
  "/vendor/pyodide/pyodide.asm.mjs",
  "/vendor/pyodide/pyodide.asm.wasm",
  "/vendor/pyodide/pyodide.mjs",
  "/vendor/pyodide/python_stdlib.zip",
  "/src/settings/ace.defaults.json",
  "/src/settings/ace.font.sizes.json",
  "/src/settings/ace.fonts.json",
  "/src/settings/ace.modes.json",
  "/src/settings/ace.themes.json",
  "/vendor/jquery/jquery-3.2.1.min.js",
  "/vendor/popper/popper.min.js",
  "/vendor/bootstrap/bootstrap.min.css",
  "/vendor/bootstrap/bootstrap.min.js",
  "/vendor/jquery-ui/jquery-ui.min.css",
  "/vendor/jquery-ui/jquery-ui.min.js",
  "/vendor/bootstrap-treeview/bootstrap-treeview.css",
  "/vendor/bootstrap-treeview/bootstrap-treeview.js",
  "/vendor/range-slider/range-slider.css",
  "/vendor/range-slider/range-slider.js",
  "/vendor/select-2/select2.min.css",
  "/vendor/select-2/select2.min.js",
  "/vendor/animate/animate.css",
  "/vendor/bootstrap-notify/bootstrap-notify.min.js",
  "/vendor/bootstrap-menu/bootstrap-menu.min.js",
  "/vendor/font-awesome/css/font-awesome.min.css",
  "/vendor/font-awesome/fonts/fontawesome-webfont.woff2",
  "/vendor/font-mfizz/css/font-mfizz.css",
  "/vendor/font-mfizz/fonts/font-mfizz.woff",
  "/vendor/font-devicon/devicon.min.css",
  "/vendor/font-devicon/fonts/devicon.woff",
  "/vendor/ace/ace.js",
  "/vendor/ace/ext-modelist.js",
  "/vendor/ace/ext-beautify.js",
  "/vendor/ace/ext-language_tools.js",
  "/vendor/ace/ext-statusbar.js",
  "/vendor/ace/theme-monokai.js",
  "/vendor/ace/mode-text.js",
  "/vendor/ace/mode-plain_text.js",
  "/vendor/ace/mode-javascript.js",
  "/vendor/ace/mode-html.js",
  "/vendor/ace/mode-css.js",
  "/vendor/ace/mode-json.js",
  "/vendor/ace/worker-javascript.js",
  "/vendor/ace/worker-css.js",
  "/vendor/ace/worker-html.js",
  "/vendor/ace/worker-json.js",
  "/src/img/codepad.16.png",
  "/src/img/codepad.32.png",
  "/src/img/codepad.64.png",
  "/src/img/codepad.96.png",
  "/src/img/codepad.128.png",
  "/src/img/codepad.192.png",
  "/src/img/codepad.256.png",
  "/src/img/codepad.512.png",
  "/src/sounds/notif-danger.ogg",
  "/src/sounds/notif-info.ogg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_VERSION)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  const networkFirstExtensions = [
    ".html",
    ".css",
    ".js",
    ".mjs",
    ".wasm",
    ".zip",
    ".json",
    ".webmanifest",
    ".woff",
    ".woff2",
    ".png",
    ".svg"
  ];
  const shouldUseNetworkFirst = networkFirstExtensions.some((ext) => url.pathname.endsWith(ext)) ||
    url.pathname.startsWith("/vendor/pyodide/");

  if (shouldUseNetworkFirst) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/src/html/app.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || caches.match("/src/html/app.html"));

      return cached || networkFetch;
    })
  );
});
