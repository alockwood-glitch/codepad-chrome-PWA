# CodePad - A Chrome OS multi-language text editor
Updated to include Pyodide Distrobution [https://pyodide.org/en/stable/](url)

![gghBeJ/codepad.jpg](https://image.ibb.co/gghBeJ/codepad.jpg)

## PWA migration

This repo now includes a Progressive Web App version for modern ChromeOS and Mac testing. The original Chrome App `manifest.json` remains in place for reference, while the PWA uses `manifest.webmanifest`, `/sw.js`, and a compatibility layer for the old Chrome APIs.

The next-stage classroom build also includes a Python-first workflow: new files default to simple top-level Python, the play button opens a separate output window, Python runs in-browser through locally vendored Pyodide with inline `input()`, common `turtle` graphics render in the popup, and HTML previews run there too. C/C++ runtime execution has been removed. VBScript needs a Windows runner because macOS and ChromeOS cannot run Windows Script Host directly.

For Chromebooks, install the PWA as the student editor; Python and HTML run in the browser. Open tabs are saved to a local draft cache, so work comes back after a refresh or accidental close, and the project tray has a close-project button.

Run it locally:

```sh
npm run check
npm start
```

Then open:

```text
http://127.0.0.1:4173/src/html/app.html
```

See [docs/PWA_TESTING.md](docs/PWA_TESTING.md) for local testing and launch notes, and [docs/CHROMEBOOK_DEPLOYMENT.md](docs/CHROMEBOOK_DEPLOYMENT.md) for school-wide Chromebook deployment.

## Note

Code Pad IDE is a free and lightweight IDE/text editor built for Chrome operating system. Code Pad allows you to write code and build projects in an easy way right on your Chrome OS device.

The IDE supports a variety of different languages!

**P.S.** You can also use it as a simple text editor, if that's all you need _(duh)_...

## Currently supported languages
Bash, C/C++, CoffeeScript, CSS3, Dockerfile, GitIgnore, GoLang, HTML5, Java, JavaScript, JSON, Less, Lua, Markdown, MS SQL, Perl, PHP, PHTML, Plain text, Python, Ruby, Rust, Sass, Scala, SQL, TypeScript, XML, XHTML.

## Features
 - Full project browsing & management
 - Over 20 familiar themes _(Monokai, etc...)_
 - Choice of crisp monospaced editor fonts
 - Ready-made code snippets
 - Syntax error & bug detection/alerts
 - Syntax highlighting
 - Code auto-completion & hinting
 - Code folding
 - Works with Google Drive or Local storage
 - Centralized clipboard with ChromeOS
 - Automatic indent and outdent
 - Tweakable interface
 - Key bindings
 - Drag & drop files with your mouse
 - Toggle between soft tabs & real tabs
 - Line wrapping
 - Runs in fullscreen
 - Cut, copy & paste functionality

## Legacy Chrome App installation

**Chromebook**

The Code Pad IDE can be installed directly from the Chrome store here: 
https://chrome.google.com/webstore/detail/code-pad-ide/adaepfiocmagdimjecpifghcgfjlfmkh

**Other devices**

Alternatively, if you're not running a Chrome OS device just follow these steps:
                                              
  - Clone/download this repo to your local machine
  - Open Google Chrome browser
  - Enter [chrome://extensions](chrome://extensions) in the URL bar and enable Developer Mode.
  - While still on the extensions page, click the button marked `Load unpacked extension...` and select the directory containing the Code Pad manifest.json file.
  - The app should be 'installed' on your device and should be accessible via your start menu or programs folder
