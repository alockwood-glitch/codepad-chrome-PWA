# Chromebook School Deployment

## What You Deploy

Deploy CodePad as a hosted PWA, not as a legacy packaged Chrome App.

Run:

```sh
npm run check
npm run package:pwa
```

This creates:

```text
dist/codepad-pwa-<version>-<date>/
dist/codepad-pwa-<version>-<date>.zip
```

Upload the contents of the package folder to an HTTPS host.

## Hosting Requirements

Serve the bundle from the root of its site or subdomain, for example:

```text
https://codepad.example-school.org/
```

The current app uses root-relative paths such as `/sw.js`, `/manifest.webmanifest`, `/src/...`, `/vendor/...`, and `/runtime/...`.

Required headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
X-Content-Type-Options: nosniff
```

Required MIME types:

```text
.webmanifest  application/manifest+json
.mjs          text/javascript; charset=utf-8
.wasm         application/wasm
.zip          application/zip
```

The local `server.js` already sends these for Mac testing. Your production host must send the same headers so Pyodide inline input works and icon/font assets load under the stricter cross-origin policy.

For a quick environment check, open:

```text
https://codepad.example-school.org/diagnostics.html
```

On a correctly hosted Chromebook deployment, `Secure context`, `Cross-origin isolated`, `SharedArrayBuffer`, Pyodide, and Font Awesome should all report OK.

When testing from your Mac, use `http://127.0.0.1:4173/src/html/app.html` for inline Python `input()` checks. A Chromebook browsing to your Mac over a LAN address such as `http://192.168.x.x:4173/...` is useful for a quick page load test, but it is not a secure context, so inline `input()` cannot work from that address.

The package includes examples in `hosting-examples/`:

```text
_headers              Cloudflare Pages / Netlify-style headers
.htaccess             Apache header and MIME example
nginx-codepad.conf    Nginx header and MIME example
```

For Hostinger/LiteSpeed, upload the root `.htaccess` file from the package into the same directory as `index.html`, normally `public_html`. Make sure your FTP/file manager is showing hidden files; `.htaccess` is easy to miss. Without that file, Hostinger may serve Pyodide or worker files with the wrong MIME type, which makes Chrome reject Python startup with errors such as `Failed to fetch dynamically imported module` or `Python runtime error: undefined`.

## Google Admin Console Rollout

Use a pilot OU first.

1. Sign in to Google Admin console.
2. Go to `Devices > Chrome > Apps & extensions`.
3. Choose `Users & browsers` for signed-in student accounts, or `Managed guest sessions` if your schools use that mode.
4. Select the pilot organizational unit or group.
5. Add a web app by URL:

```text
https://codepad.example-school.org/src/html/app.html
```

6. Set `Installation policy` to `Force install + pin to ChromeOS taskbar`.
7. Save.
8. On a test Chromebook, visit `chrome://policy`, click `Reload policies`, and confirm the policy is OK.
9. Launch CodePad from the shelf/app launcher and run a simple Python file.

After the pilot passes, apply the same app policy to the wider student OUs.

## Update Process

1. Make code changes.
2. Bump cache/version query strings when runtime files change.
3. Run:

```sh
npm run check
npm run package:pwa
```

4. Upload the new package contents over the old hosted app.
5. Test one managed Chromebook before broad rollout.

The service worker is network-first for HTML, CSS, JavaScript, Pyodide, manifest, fonts, images, wasm, zip, and JSON files, so updates should land quickly after reload.

## Student Data Notes

Open tabs are cached locally in the browser so accidental refreshes or closes restore the student's current code. This is device/browser-local storage, not a cloud sync or submission system.

Python runs inside the browser through locally bundled Pyodide. HTML previews run in the browser. C/C++ execution is intentionally not included in the Chromebook runtime. VBScript still requires a separate Windows Script Host backend if you choose to support it.
