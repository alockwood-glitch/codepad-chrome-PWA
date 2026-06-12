(function () {
    "use strict";

    let nativeChrome = window.chrome || {};
    let isLegacyChromeApp = !!(
        nativeChrome.app &&
        nativeChrome.app.runtime &&
        nativeChrome.app.window &&
        nativeChrome.fileSystem &&
        nativeChrome.runtime &&
        typeof nativeChrome.runtime.getManifest === "function"
    );

    let textExtensions = ["as", "as3", "asm", "bat", "c", "cc", "cfc", "cfm", "cgi", "coffee", "cnf", "conf", "cpp", "cs", "csh", "css", "csv", "dart", "diff", "do", "ejs", "el", "erb", "glsl", "go", "h", "haml", "handlebars", "haxe", "hs", "htm", "html", "htmls", "ini", "jade", "java", "js", "jsx", "json", "ksh", "less", "log", "love", "lua", "m", "make", "man", "manifest", "markdown", "mat", "md", "mdoc", "me", "micro", "obc", "patch", "php", "phtml", "pkb", "pkg", "pks", "pl", "pls", "pm", "ps", "py", "r", "rake", "rb", "sass", "scala", "scss", "sh", "shtml", "sql", "styl", "svg", "tex", "text", "ts", "tsx", "tsv", "txt", "vbs", "vcf", "xml", "yaml", "yml", "zsh"];
    let textMimeTypes = ["text/*", "image/svg+xml", "application/ecmascript", "application/java", "application/java-byte-code", "application/javascript", "application/plain", "application/pkix-cert", "application/pkcs7-mime", "application/rtf", "application/xml", "application/x-bsh", "application/x-bytecode.python", "application/x-csh", "application/x-javascript", "application/x-java-class", "application/x-lisp", "application/x-php", "application/x-pkcs7-mime", "application/x-pkcs7-signature", "application/x-pkcs7-certreqresp", "application/x-pointplus", "application/x-rtf", "application/x-sh", "application/x-shar", "application/x-x509-ca-cert", "application/x-x509-user-cert", "application/json"];

    let manifest = {
        version: "1.0.96",
        manifest_version: 3,
        minimum_chrome_version: "102",
        name: "Code Pad Text Editor",
        short_name: "CodePad",
        description: "A multi-language code text editor for ChromeOS, Chromebooks, and modern browsers.",
        author: "Andrew Borg",
        homepage_url: "https://github.com/andrewbrg/codepad-chrome-app",
        offline_enabled: true,
        file_handlers: {
            text: {
                extensions: textExtensions,
                types: textMimeTypes
            }
        },
        icons: {
            "16": "/src/img/codepad.16.png",
            "32": "/src/img/codepad.32.png",
            "64": "/src/img/codepad.64.png",
            "96": "/src/img/codepad.96.png",
            "128": "/src/img/codepad.128.png",
            "192": "/src/img/codepad.192.png",
            "256": "/src/img/codepad.256.png",
            "512": "/src/img/codepad.512.png"
        }
    };

    window.launchData = window.launchData || {items: []};
    window.__MGA__bRestart = window.__MGA__bRestart || false;

    let CodePadPwa = window.CodePadPwa = window.CodePadPwa || {};
    CodePadPwa.isLegacyChromeApp = isLegacyChromeApp;
    CodePadPwa.getManifest = function () {
        return isLegacyChromeApp ? nativeChrome.runtime.getManifest() : manifest;
    };
    document.documentElement.setAttribute("data-codepad-runtime", isLegacyChromeApp ? "chrome-app" : "pwa");

    if (isLegacyChromeApp) {
        return;
    }

    let chrome = window.chrome = nativeChrome;
    let launchListeners = [];
    let retainedEntries = {};

    function setLastError(message) {
        chrome.runtime.lastError = message ? {message: message} : undefined;
    }

    function runCallback(callback, value, errorMessage) {
        setLastError(errorMessage);
        if (typeof callback === "function") {
            callback(value);
        }
        setLastError();
    }

    function asyncCallback(callback, value, errorMessage) {
        window.setTimeout(function () {
            runCallback(callback, value, errorMessage);
        }, 0);
    }

    function storageKey(area, key) {
        return "codepad:" + area + ":" + key;
    }

    function readStorageValue(area, key) {
        let raw = window.localStorage.getItem(storageKey(area, key));
        if (raw === null) {
            return undefined;
        }

        try {
            return JSON.parse(raw);
        } catch (e) {
            return raw;
        }
    }

    function createStorageArea(area) {
        return {
            get: function (keys, callback) {
                let result = {};

                if (keys === null || typeof keys === "undefined") {
                    Object.keys(window.localStorage).forEach(function (key) {
                        let prefix = storageKey(area, "");
                        if (key.indexOf(prefix) === 0) {
                            let cleanKey = key.replace(prefix, "");
                            result[cleanKey] = readStorageValue(area, cleanKey);
                        }
                    });
                } else if (typeof keys === "string") {
                    result[keys] = readStorageValue(area, keys);
                } else if (Array.isArray(keys)) {
                    keys.forEach(function (key) {
                        result[key] = readStorageValue(area, key);
                    });
                } else {
                    Object.keys(keys).forEach(function (key) {
                        let value = readStorageValue(area, key);
                        result[key] = typeof value === "undefined" ? keys[key] : value;
                    });
                }

                asyncCallback(callback, result);
            },
            set: function (items, callback) {
                Object.keys(items || {}).forEach(function (key) {
                    window.localStorage.setItem(storageKey(area, key), JSON.stringify(items[key]));
                });
                asyncCallback(callback);
            },
            remove: function (keys, callback) {
                (Array.isArray(keys) ? keys : [keys]).forEach(function (key) {
                    window.localStorage.removeItem(storageKey(area, key));
                });
                asyncCallback(callback);
            }
        };
    }

    function openHandlesDb() {
        return new Promise(function (resolve, reject) {
            if (!("indexedDB" in window)) {
                reject(new Error("IndexedDB is not available"));
                return;
            }

            let request = window.indexedDB.open("codepad-pwa", 1);
            request.onupgradeneeded = function () {
                request.result.createObjectStore("handles");
            };
            request.onsuccess = function () {
                resolve(request.result);
            };
            request.onerror = function () {
                reject(request.error);
            };
        });
    }

    function idbGet(key) {
        return openHandlesDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                let tx = db.transaction("handles", "readonly");
                let request = tx.objectStore("handles").get(key);
                request.onsuccess = function () {
                    resolve(request.result);
                };
                request.onerror = function () {
                    reject(request.error);
                };
            });
        });
    }

    function idbSet(key, value) {
        return openHandlesDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                let tx = db.transaction("handles", "readwrite");
                let request = tx.objectStore("handles").put(value, key);
                request.onsuccess = function () {
                    resolve();
                };
                request.onerror = function () {
                    reject(request.error);
                };
            });
        });
    }

    function normalizePath(value) {
        return ("/" + value).replace(/\/+/g, "/");
    }

    function getEntryId(entry) {
        return "pwa:" + window.btoa(unescape(encodeURIComponent(entry.fullPath || entry.name)))
            .replace(/=+$/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    }

    function createDownload(fileName, content) {
        let link = document.createElement("a");
        let blob = content instanceof Blob ? content : new Blob([content], {type: "text/plain"});
        link.href = URL.createObjectURL(blob);
        link.download = fileName || "untitled.txt";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        window.setTimeout(function () {
            URL.revokeObjectURL(link.href);
            link.remove();
        }, 0);
    }

    function createWriterFacade(entry) {
        let writer = {
            INIT: 0,
            WRITING: 1,
            DONE: 2,
            readyState: 0,
            onabort: null,
            onerror: null,
            onwriteend: null,
            _position: 0,
            _truncateSize: undefined,
            abort: function () {
                writer.readyState = writer.DONE;
                if (typeof writer.onabort === "function") {
                    writer.onabort(new DOMException("Aborted", "AbortError"));
                }
            },
            seek: function (position) {
                writer._position = position;
            },
            truncate: function (size) {
                writer._truncateSize = size;
            },
            write: function (content) {
                writer.readyState = writer.WRITING;

                let complete = function () {
                    writer.readyState = writer.DONE;
                    if (typeof writer.onwriteend === "function") {
                        writer.onwriteend({target: writer});
                    }
                };

                let fail = function (err) {
                    writer.readyState = writer.DONE;
                    if (typeof writer.onerror === "function") {
                        writer.onerror(err);
                    }
                };

                if (!entry.handle || typeof entry.handle.createWritable !== "function") {
                    createDownload(entry.name, content);
                    complete();
                    return;
                }

                entry.handle.createWritable()
                    .then(function (writable) {
                        let chain = Promise.resolve();
                        if (typeof writer._truncateSize !== "undefined") {
                            chain = chain.then(function () {
                                return writable.truncate(writer._truncateSize);
                            });
                        }
                        if (writer._position > 0) {
                            chain = chain.then(function () {
                                return writable.seek(writer._position);
                            });
                        }
                        return chain
                            .then(function () {
                                return writable.write(content);
                            })
                            .then(function () {
                                return writable.close();
                            });
                    })
                    .then(complete)
                    .catch(fail);
            }
        };

        return writer;
    }

    function createEntryFromFile(file) {
        return {
            isDirectory: false,
            isFile: true,
            name: file.name || "untitled.txt",
            fullPath: normalizePath(file.name || "untitled.txt"),
            type: file.type || "",
            file: function (callback) {
                callback(file);
            },
            createWriter: function (callback) {
                callback(createWriterFacade(this));
            }
        };
    }

    function wrapHandle(handle, parentPath) {
        let fullPath = normalizePath((parentPath || "") + "/" + handle.name);
        let entry = {
            handle: handle,
            isDirectory: handle.kind === "directory",
            isFile: handle.kind === "file",
            name: handle.name,
            fullPath: fullPath,
            type: "",
            file: function (callback, errorCallback) {
                if (handle.kind !== "file") {
                    if (typeof errorCallback === "function") {
                        errorCallback("Entry is not a file");
                    }
                    return;
                }

                handle.getFile()
                    .then(function (file) {
                        callback(file);
                    })
                    .catch(errorCallback || console.info);
            },
            createWriter: function (callback) {
                callback(createWriterFacade(entry));
            }
        };

        if (handle.kind === "directory") {
            entry.createReader = function () {
                let didRead = false;
                return {
                    readEntries: function (callback, errorCallback) {
                        if (didRead) {
                            callback([]);
                            return;
                        }

                        didRead = true;
                        let entries = [];

                        (async function () {
                            for await (let childHandle of handle.values()) {
                                entries.push(wrapHandle(childHandle, fullPath));
                            }
                            callback(entries);
                        })().catch(errorCallback || console.info);
                    }
                };
            };

            entry.getFile = function (requestedPath, opts, callback, errorCallback) {
                let cleanPath = normalizePath(requestedPath).replace(normalizePath(fullPath), "");
                let parts = cleanPath.split("/").filter(Boolean);

                (async function () {
                    let dirHandle = handle;
                    let currentPath = fullPath;
                    for (let i = 0; i < parts.length; i++) {
                        let part = parts[i];
                        if (i === parts.length - 1) {
                            let fileHandle = await dirHandle.getFileHandle(part, opts || {});
                            callback(wrapHandle(fileHandle, currentPath));
                        } else {
                            dirHandle = await dirHandle.getDirectoryHandle(part);
                            currentPath = normalizePath(currentPath + "/" + part);
                        }
                    }
                })().catch(errorCallback || console.info);
            };
        }

        return entry;
    }

    function pickerTypes() {
        return [{
            description: "Code and text files",
            accept: {
                "text/*": textExtensions.map(function (ext) {
                    return "." + ext;
                }),
                "application/json": [".json"],
                "image/svg+xml": [".svg"]
            }
        }];
    }

    function openFileFallback(callback) {
        let input = document.createElement("input");
        input.type = "file";
        input.accept = textExtensions.map(function (ext) {
            return "." + ext;
        }).join(",");
        input.style.display = "none";
        input.addEventListener("change", function () {
            let file = input.files && input.files[0];
            input.remove();
            if (!file) {
                asyncCallback(callback, undefined, "User cancelled");
                return;
            }
            asyncCallback(callback, createEntryFromFile(file));
        });
        document.body.appendChild(input);
        input.click();
    }

    function saveFileFallback(options, callback) {
        asyncCallback(callback, {
            isDirectory: false,
            isFile: true,
            name: options.suggestedName || "untitled.txt",
            fullPath: normalizePath(options.suggestedName || "untitled.txt"),
            createWriter: function (writerCallback) {
                writerCallback(createWriterFacade(this));
            }
        });
    }

    chrome.runtime = chrome.runtime || {};
    chrome.runtime.lastError = undefined;
    chrome.runtime.getManifest = function () {
        return manifest;
    };

    chrome.storage = chrome.storage || {};
    chrome.storage.local = chrome.storage.local || createStorageArea("local");
    chrome.storage.sync = chrome.storage.sync || createStorageArea("sync");

    chrome.notifications = chrome.notifications || {};
    chrome.notifications.create = chrome.notifications.create || function (id, options, callback) {
        console.info((options && options.title ? options.title + ": " : "") + (options && options.message ? options.message : ""));
        asyncCallback(callback, id);
    };
    chrome.notifications.onButtonClicked = chrome.notifications.onButtonClicked || {
        addListener: function () {}
    };

    chrome.app = chrome.app || {};
    chrome.app.runtime = chrome.app.runtime || {};
    chrome.app.runtime.onLaunched = chrome.app.runtime.onLaunched || {
        addListener: function (callback) {
            launchListeners.push(callback);
        }
    };
    chrome.app.runtime.onRestarted = chrome.app.runtime.onRestarted || {
        addListener: function () {}
    };
    chrome.app.window = chrome.app.window || {};
    chrome.app.window.current = chrome.app.window.current || function () {
        return {
            close: function () {
                window.close();
            },
            fullscreen: function () {
                if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                }
            },
            maximize: function () {
                window.dispatchEvent(new Event("resize"));
            },
            minimize: function () {
                console.info("Minimize is handled by the browser window in the PWA.");
            }
        };
    };

    chrome.fileSystem = chrome.fileSystem || {};
    chrome.fileSystem.chooseEntry = chrome.fileSystem.chooseEntry || function (options, callback) {
        options = options || {};

        if (options.type === "openDirectory") {
            if (!("showDirectoryPicker" in window)) {
                asyncCallback(callback, undefined, "Directory picking is not available in this browser");
                return;
            }

            window.showDirectoryPicker({id: "codepad-projects", mode: "readwrite"})
                .then(function (handle) {
                    runCallback(callback, wrapHandle(handle, ""));
                })
                .catch(function (err) {
                    asyncCallback(callback, undefined, err && err.name === "AbortError" ? "User cancelled" : err.message);
                });
            return;
        }

        if (options.type === "saveFile") {
            if (!("showSaveFilePicker" in window)) {
                saveFileFallback(options, callback);
                return;
            }

            window.showSaveFilePicker({
                id: "codepad-save",
                suggestedName: options.suggestedName || "untitled.txt",
                types: pickerTypes()
            })
                .then(function (handle) {
                    runCallback(callback, wrapHandle(handle, ""));
                })
                .catch(function (err) {
                    asyncCallback(callback, undefined, err && err.name === "AbortError" ? "User cancelled" : err.message);
                });
            return;
        }

        if (!("showOpenFilePicker" in window)) {
            openFileFallback(callback);
            return;
        }

        window.showOpenFilePicker({
            id: "codepad-open",
            multiple: false,
            types: pickerTypes()
        })
            .then(function (handles) {
                runCallback(callback, wrapHandle(handles[0], ""));
            })
            .catch(function (err) {
                asyncCallback(callback, undefined, err && err.name === "AbortError" ? "User cancelled" : err.message);
            });
    };

    chrome.fileSystem.getWritableEntry = chrome.fileSystem.getWritableEntry || function (entry, callback) {
        asyncCallback(callback, entry);
    };

    chrome.fileSystem.getDisplayPath = chrome.fileSystem.getDisplayPath || function (entry, callback) {
        asyncCallback(callback, entry.fullPath || entry.name || "");
    };

    chrome.fileSystem.retainEntry = chrome.fileSystem.retainEntry || function (entry) {
        let id = getEntryId(entry);
        retainedEntries[id] = entry;

        if (entry.handle) {
            idbSet(id, {
                handle: entry.handle,
                fullPath: entry.fullPath
            }).catch(console.info);
        }

        return id;
    };

    chrome.fileSystem.isRestorable = chrome.fileSystem.isRestorable || function (id, callback) {
        if (retainedEntries[id]) {
            asyncCallback(callback, true);
            return;
        }

        idbGet(id)
            .then(function (stored) {
                asyncCallback(callback, !!stored);
            })
            .catch(function () {
                asyncCallback(callback, false);
            });
    };

    chrome.fileSystem.restoreEntry = chrome.fileSystem.restoreEntry || function (id, callback) {
        if (retainedEntries[id]) {
            asyncCallback(callback, retainedEntries[id]);
            return;
        }

        idbGet(id)
            .then(function (stored) {
                if (!stored || !stored.handle) {
                    asyncCallback(callback, undefined, "Entry is not restorable");
                    return;
                }

                let entry = wrapHandle(stored.handle, stored.fullPath ? stored.fullPath.replace("/" + stored.handle.name, "") : "");
                retainedEntries[id] = entry;
                asyncCallback(callback, entry);
            })
            .catch(function (err) {
                asyncCallback(callback, undefined, err.message);
            });
    };

    CodePadPwa.wrapFileHandle = function (handle) {
        return wrapHandle(handle, "");
    };

    CodePadPwa.createEntryFromFile = function (file) {
        return createEntryFromFile(file);
    };

    CodePadPwa.dispatchLaunch = function (launchData) {
        window.launchData = launchData || {items: []};
        launchListeners.forEach(function (callback) {
            callback(window.launchData);
        });
    };

    if ("launchQueue" in window && "LaunchParams" in window && "files" in LaunchParams.prototype) {
        window.launchQueue.setConsumer(function (launchParams) {
            if (!launchParams.files || !launchParams.files.length) {
                return;
            }

            CodePadPwa.dispatchLaunch({
                items: launchParams.files.map(function (fileHandle) {
                    return {
                        entry: wrapHandle(fileHandle, ""),
                        type: ""
                    };
                })
            });
        });
    }
})();
