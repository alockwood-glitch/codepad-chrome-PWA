(function () {
    "use strict";

    let pyodide = null;
    let pyodideReady = null;
    let inputState = null;
    let inputBuffer = null;
    let inputDecoder = new TextDecoder();

    function post(type, data) {
        self.postMessage(Object.assign({type: type}, data || {}));
    }

    function readInlineInput() {
        if (!inputState || !inputBuffer) {
            throw new Error("input() needs HTTPS or localhost with COOP/COEP headers. Print-only Python programs can run here, but inline input is disabled on this host.");
        }

        Atomics.store(inputState, 0, 0);
        Atomics.store(inputState, 1, 0);
        post("input-request");
        Atomics.wait(inputState, 0, 0);

        if (Atomics.load(inputState, 0) < 0) {
            throw new Error("Input cancelled.");
        }

        let length = Atomics.load(inputState, 1);
        return inputDecoder.decode(inputBuffer.slice(0, length));
    }

    async function loadTurtleShim(turtleShimUrl) {
        if (!turtleShimUrl) {
            return;
        }

        let response = await fetch(turtleShimUrl, {cache: "no-store"});
        if (!response.ok) {
            throw new Error("Unable to load turtle compatibility shim.");
        }

        pyodide.FS.writeFile("/home/pyodide/turtle.py", await response.text(), {encoding: "utf8"});
    }

    async function ensurePyodide(config) {
        if (pyodideReady) {
            return pyodideReady;
        }

        pyodideReady = (async function () {
            post("system", {text: "[loading Pyodide]\n"});
            let pyodideModule = await import(config.pyodideUrl);

            pyodide = await pyodideModule.loadPyodide({
                indexURL: config.pyodideIndexUrl,
                stdin: readInlineInput,
                stdout: function (text) {
                    post("stdout", {text: String(text) + "\n"});
                },
                stderr: function (text) {
                    post("stderr", {text: String(text) + "\n"});
                }
            });

            await loadTurtleShim(config.turtleShimUrl);
            post("system", {text: "[Pyodide " + pyodide.version + " ready]\n"});
            return pyodide;
        })();

        return pyodideReady;
    }

    async function runPython(message) {
        inputState = message.inputStateBuffer ? new Int32Array(message.inputStateBuffer) : null;
        inputBuffer = message.inputBuffer ? new Uint8Array(message.inputBuffer) : null;

        let runtime = await ensurePyodide(message.config || {});
        let code = String(message.code || "");

        if (!code.trim()) {
            post("error", {text: "No Python code was provided.\n"});
            post("exit", {ok: false, exitCode: 1});
            return;
        }

        try {
            post("system", {text: "[starting Python]\n"});
            await runtime.loadPackagesFromImports(code, {
                messageCallback: function (message) {
                    post("system", {text: "[" + message + "]\n"});
                },
                errorCallback: function (message) {
                    post("stderr", {text: message + "\n"});
                }
            });
            await runtime.runPythonAsync(code, {filename: "main.py"});
            post("exit", {ok: true, exitCode: 0});
        } catch (err) {
            post("stderr", {text: (err && err.message ? err.message : String(err)) + "\n"});
            post("exit", {ok: false, exitCode: 1});
        }
    }

    self.onmessage = function (event) {
        let message = event.data || {};

        if (message.type === "run") {
            runPython(message).catch(function (err) {
                post("stderr", {text: (err && err.message ? err.message : String(err)) + "\n"});
                post("exit", {ok: false, exitCode: 1});
            });
        }
    };
})();
