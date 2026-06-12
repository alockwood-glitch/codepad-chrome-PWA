# CodePad PWA Testing And Launch Notes

## Local Mac Testing

Run the static checks:

```sh
npm run check
```

Start the local test server:

```sh
npm start
```

Open the app in Chrome:

```text
http://127.0.0.1:4173/src/html/app.html
```

Chrome treats `localhost` and `127.0.0.1` as secure contexts, so the service worker and install flow can be tested from your Mac without a certificate.

Open the diagnostics page as well:

```text
http://127.0.0.1:4173/diagnostics.html
```

For a healthy local run, `Secure context`, `Cross-origin isolated`, `SharedArrayBuffer`, Pyodide, and Font Awesome should all report OK.

On the hosted site, the Pyodide worker and module must report `text/javascript`, and the Pyodide wasm file must report `application/wasm`. If any of those show `text/plain` or `application/x-javascript`, upload the package's root `.htaccess` file to the same hosted folder as `index.html`, then clear the host cache.

## Classroom Runtime

Inside CodePad, use the play button in the top bar to open the output window. The app detects the active file extension and runs or previews it in the popup.

Python runs in the browser through Pyodide. Programs that call `input()` accept input inline in the output window terminal. Type the answer on the prompt line at the bottom of the terminal and press Enter.

The runtime supports beginner `turtle` graphics. Code such as this opens a canvas in the output window:

```py
import turtle

turtle.forward(100)
turtle.right(90)
turtle.forward(100)
turtle.done()
```

The browser canvas is powered by a local compatibility shim for common turtle commands. It is designed for classroom basics such as `forward`, `backward`, `left`, `right`, `goto`, `penup`, `pendown`, `color`, `pensize`, `circle`, `dot`, and `write`.

HTML files open as a live preview in the output window.

C and C++ runtime execution has been removed from this Chromebook build. C/C++ files can still be edited with syntax highlighting, but the play button will show a clear unsupported-runtime message.

VBScript requires Windows Script Host (`cscript.exe`). The Mac test server cannot run VBScript directly; for that you need a Windows runner VM/server, or a separate VBScript-compatible backend.

For Mac testing, run:

```sh
npm start
```

Pyodide is loaded from the local files in `vendor/pyodide/` by default. This avoids runtime failures when a Chromebook or school network cannot reach a third-party CDN. If you deliberately want to use a hosted Pyodide copy instead, change `pyodideUrl` and `pyodideIndexUrl` in `src/js/runtime-config.js`.

The local server sends the COOP/COEP/CORP headers so inline `input()` can pause safely inside the Pyodide worker and local fonts/icons can load under cross-origin isolation. Use equivalent headers on your HTTPS host.

If you browse from a Chromebook to your Mac using a LAN address such as `http://192.168.x.x:4173/...`, Chrome will not treat that HTTP address as a secure context. Print-only Python programs should still run, but Python code that calls `input()` needs either `127.0.0.1` on the same machine or a real HTTPS host with the required headers.

If you see an old error such as `Failed to execute 'importScripts' on 'WorkerGlobalScope'`, Chrome is still running an older cached service worker or runtime config. Open DevTools > Application > Service Workers, unregister the old worker, clear site data for the local URL, then reload the app twice.

## Draft Cache And Projects

Open tabs are saved to a local browser draft cache as students type. If the PWA is refreshed or accidentally closed, CodePad restores the previous tab names, contents, and active tab on the next launch.

The project tray now includes a close-project button. Closing a project clears the project tree and resets the tray to the empty project view, while leaving open editor tabs in place.

## Runtime Deployment For Chromebooks

Chromebooks can install and run the editor as a PWA. Python runs in-browser through Pyodide, and HTML previews run in-browser too. VBScript still requires a reachable Windows Script Host backend if you choose to support it.

If a VBScript runtime is hosted separately, set the API origin in `src/js/runtime-config.js`:

```js
window.CodePadRuntimeConfig.apiBaseUrl = "https://runner.example.org";
```

Then start the runtime server with the PWA origin allowed:

```sh
ALLOWED_ORIGIN=https://codepad.example.org HOST=0.0.0.0 npm start
```

For quick LAN browsing from a Chromebook to your Mac, `HOST=0.0.0.0 npm start` exposes the server on your Mac's network address. That is useful for a smoke test, but full PWA install/service-worker testing still needs `localhost` on the same machine or a real HTTPS origin.

## Install Testing

1. Open `http://127.0.0.1:4173/src/html/app.html` in Chrome.
2. Open DevTools > Application.
3. Check Manifest:
   - `name` is `Code Pad Text Editor`.
   - `start_url` is `/src/html/app.html`.
   - display mode is `standalone`.
   - 192px and 512px icons are present.
   - `file_handlers` is present for text/code files.
4. Check Service Workers:
   - `/sw.js` is registered and activated.
   - Reload once after updates so the newest worker controls the page.
5. Use Chrome's install button in the address bar or Chrome menu.

## Chromebook Launch Path

The PWA should be hosted from an HTTPS origin for Chromebook installs outside local testing. Once hosted, Chromebook users can install it directly from Chrome, and managed school/business devices can deploy it as a web app from the Google Admin console.

For the school-wide package and Admin console rollout checklist, see [CHROMEBOOK_DEPLOYMENT.md](CHROMEBOOK_DEPLOYMENT.md).

The Chrome Web Store publishing docs now focus on extensions. A PWA itself is not uploaded as a Chrome Web Store ZIP package in the way the old packaged Chrome App was. If you need a store presence, the realistic options are:

- Keep or update any existing legacy listing only where Google still permits it.
- Publish a narrow companion Chrome extension only if it has a genuine extension purpose.
- Publish the PWA URL and install instructions from your own site.
- For managed Chromebooks, deploy the hosted PWA through Admin console web-app policies.

## What Changed

- Added `manifest.webmanifest` for installability and ChromeOS file handling.
- Added `/sw.js` for offline shell caching and runtime caching.
- Added a Chrome App compatibility layer at `/src/js/pwa/chrome-compat.js`.
- Added direct popup runtimes for Pyodide Python, HTML preview, and platform-dependent VBScript handling.
- Removed the old native Python and C/C++ compiler runtime endpoints.
- Added local draft caching and a project-close control in the project tray.
- Added local test server scripts in `package.json` and `server.js`.
- Kept the old `manifest.json` in place as legacy Chrome App reference material.

## Current Limits

Modern browser file access is user-permission based. Open, save, save-as, project folders, and installed-PWA file launches use the File System Access and File Handling APIs where Chrome supports them. Browser PWAs cannot silently rename or move arbitrary local files the way the old Chrome App filesystem API could, so rename updates the tab/sidebar name and users can save the content under the new name when needed.
