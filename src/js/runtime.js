(function () {
    "use strict";

    let currentToken = null;
    let currentSessionId = null;
    let currentLanguage = 'python';
    let source = null;
    let turtleReady = false;
    let stderrRemainder = '';
    let pyodideWorker = null;
    let inputState = null;
    let inputBuffer = null;
    let inputEncoder = new TextEncoder();

    let $main = document.querySelector('.runtime-main');
    let $title = document.querySelector('.runtime-title');
    let $stream = document.querySelector('.terminal-stream');
    let $form = document.querySelector('.terminal-input-line');
    let $input = document.querySelector('.terminal-input');
    let $stop = document.querySelector('.runtime-stop');
    let canvas = document.getElementById('turtle-canvas');
    let ctx = canvas.getContext('2d');
    let $htmlPreview = document.querySelector('.html-preview');

    let turtlePrefix = '__CODEPAD_TURTLE__';
    let inputBufferSize = 64 * 1024;
    let languageNames = {
        python: 'Python',
        html: 'HTML',
        vbscript: 'VBScript',
        c: 'C',
        cpp: 'C++'
    };

    function runtimeConfig() {
        return window.CodePadRuntimeConfig || {};
    }

    function runtimeApiBaseUrl() {
        let config = runtimeConfig();
        let value = config.apiBaseUrl || window.localStorage.getItem('codepad.runtimeApiBaseUrl') || '';
        return String(value).replace(/\/+$/, '');
    }

    function runtimeApiUrl(path) {
        return runtimeApiBaseUrl() + path;
    }

    function pyodideUrl() {
        return runtimeConfig().pyodideUrl ||
            window.localStorage.getItem('codepad.pyodideUrl') ||
            '/vendor/pyodide/pyodide.mjs';
    }

    function pyodideIndexUrl() {
        let configured = runtimeConfig().pyodideIndexUrl || window.localStorage.getItem('codepad.pyodideIndexUrl');
        if (configured) {
            return String(configured).replace(/\/?$/, '/');
        }

        return pyodideUrl().replace(/pyodide\.js(?:\?.*)?$/, '');
    }

    function terminalLine(text, className) {
        let line = document.createElement('span');
        line.className = 'terminal-line ' + (className || 'stdout');
        line.textContent = text;
        $stream.appendChild(line);
        $stream.scrollTop = $stream.scrollHeight;
    }

    function setInputEnabled(enabled) {
        $input.disabled = !enabled;
        if (enabled) {
            $input.focus();
        }
    }

    function resetTerminal() {
        $stream.textContent = '';
        setInputEnabled(false);
    }

    function resetPanels() {
        turtleReady = false;
        stderrRemainder = '';
        $main.classList.remove('has-turtle');
        $main.classList.remove('has-html');
        $htmlPreview.removeAttribute('srcdoc');
        resetTurtle();
    }

    function stopPyodideWorker() {
        if (inputState) {
            Atomics.store(inputState, 0, -1);
            Atomics.notify(inputState, 0);
        }

        if (pyodideWorker) {
            pyodideWorker.terminate();
            pyodideWorker = null;
        }

        inputState = null;
        inputBuffer = null;
        currentSessionId = null;
        setInputEnabled(false);
    }

    function turtleX(x) {
        return canvas.width / 2 + Number(x || 0);
    }

    function turtleY(y) {
        return canvas.height / 2 - Number(y || 0);
    }

    function resetTurtle() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    function ensureTurtle() {
        if (!turtleReady) {
            turtleReady = true;
            $main.classList.add('has-turtle');
            resetTurtle();
        }
    }

    function drawTurtle(event) {
        ensureTurtle();

        if (event.type === 'reset' || event.type === 'clear') {
            resetTurtle();
            return;
        }

        if (event.type === 'background') {
            ctx.fillStyle = event.color || '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        if (event.type === 'line') {
            ctx.strokeStyle = event.color || '#111827';
            ctx.lineWidth = event.width || 2;
            ctx.beginPath();
            ctx.moveTo(turtleX(event.from[0]), turtleY(event.from[1]));
            ctx.lineTo(turtleX(event.to[0]), turtleY(event.to[1]));
            ctx.stroke();
            return;
        }

        if (event.type === 'dot') {
            ctx.fillStyle = event.color || '#111827';
            ctx.beginPath();
            ctx.arc(turtleX(event.x), turtleY(event.y), Number(event.size || 8) / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        if (event.type === 'text') {
            ctx.fillStyle = event.color || '#111827';
            ctx.font = '16px sans-serif';
            ctx.fillText(String(event.text || ''), turtleX(event.x), turtleY(event.y));
        }
    }

    function handleStderrText(text, flushRemainder) {
        let combined = stderrRemainder + text;
        let lines = combined.split(/\r?\n/);
        stderrRemainder = flushRemainder ? '' : lines.pop();

        lines.forEach(function (line) {
            if (!line && !flushRemainder) {
                return;
            }

            if (line.indexOf(turtlePrefix) === 0) {
                try {
                    drawTurtle(JSON.parse(line.slice(turtlePrefix.length)));
                } catch (err) {
                    terminalLine(line + '\n', 'stderr');
                }
            } else {
                terminalLine(line + '\n', 'stderr');
            }
        });
    }

    function connectServerEvents(sessionId) {
        if (source) {
            source.close();
        }

        source = new EventSource(runtimeApiUrl('/api/runtime/' + encodeURIComponent(currentLanguage) + '/session/' + encodeURIComponent(sessionId) + '/events'));

        source.addEventListener('stdout', function (event) {
            terminalLine(JSON.parse(event.data).text, 'stdout');
        });

        source.addEventListener('stderr', function (event) {
            terminalLine(JSON.parse(event.data).text, 'stderr');
        });

        source.addEventListener('system', function (event) {
            terminalLine(JSON.parse(event.data).text + '\n', 'system');
        });

        source.addEventListener('exit', function (event) {
            let data = JSON.parse(event.data);
            terminalLine('\n[finished with exit code ' + data.exitCode + ']\n', data.ok ? 'system' : 'stderr');
            setInputEnabled(false);
            source.close();
        });

        source.addEventListener('error', function () {
            terminalLine('\n[runtime connection closed]\n', 'stderr');
            setInputEnabled(false);
            if (source) {
                source.close();
            }
        });
    }

    function startServerRun(payload) {
        terminalLine('[starting ' + (languageNames[currentLanguage] || currentLanguage) + ']\n', 'system');

        fetch(runtimeApiUrl('/api/runtime/' + encodeURIComponent(currentLanguage) + '/session'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: payload.code || '',
                timeoutMs: payload.timeoutMs || 60000
            })
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (result) {
                if (!result.ok) {
                    terminalLine(result.error || 'Unable to start runtime.', 'stderr');
                    return;
                }

                currentSessionId = result.sessionId;
                terminalLine('[' + (result.runtimeVersion || languageNames[currentLanguage] || 'Runtime') + ']\n', 'system');
                connectServerEvents(currentSessionId);
            })
            .catch(function (err) {
                terminalLine('Runtime server is not available.\n' + err.message + '\n', 'stderr');
            });
    }

    function startPyodideRun(payload) {
        stopPyodideWorker();

        let supportsInlineInput = typeof SharedArrayBuffer !== 'undefined' && !!window.crossOriginIsolated;

        currentSessionId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        if (supportsInlineInput) {
            inputState = new Int32Array(new SharedArrayBuffer(8));
            inputBuffer = new Uint8Array(new SharedArrayBuffer(inputBufferSize));
        }
        pyodideWorker = new Worker('/src/js/pyodide-worker.js?v=20260612-4', {type: 'module'});

        pyodideWorker.onmessage = function (event) {
            let message = event.data || {};

            if (message.type === 'stdout') {
                terminalLine(message.text, 'stdout');
                return;
            }

            if (message.type === 'stderr') {
                handleStderrText(message.text, false);
                return;
            }

            if (message.type === 'system') {
                terminalLine(message.text, 'system');
                return;
            }

            if (message.type === 'input-request') {
                setInputEnabled(true);
                return;
            }

            if (message.type === 'error') {
                terminalLine(message.text || 'Python runtime error.\n', 'stderr');
                return;
            }

            if (message.type === 'exit') {
                handleStderrText('\n', true);
                terminalLine('\n[finished with exit code ' + message.exitCode + ']\n', message.ok ? 'system' : 'stderr');
                stopPyodideWorker();
            }
        };

        pyodideWorker.onerror = function (event) {
            terminalLine('Python runtime error: ' + event.message + '\n', 'stderr');
            stopPyodideWorker();
        };

        pyodideWorker.postMessage({
            type: 'run',
            sessionId: currentSessionId,
            code: payload.code || '',
            timeoutMs: payload.timeoutMs || 60000,
            inputStateBuffer: supportsInlineInput ? inputState.buffer : null,
            inputBuffer: supportsInlineInput ? inputBuffer.buffer : null,
            config: {
                pyodideUrl: pyodideUrl(),
                pyodideIndexUrl: pyodideIndexUrl(),
                turtleShimUrl: window.location.origin + '/runtime/python/turtle.py',
                inlineInput: supportsInlineInput
            }
        });
    }

    function renderHtml(payload) {
        $main.classList.add('has-html');
        terminalLine('[rendering HTML preview]\n', 'system');
        $htmlPreview.srcdoc = payload.code || '';
        terminalLine('[preview ready]\n', 'system');
    }

    function startRun(payload) {
        if (source) {
            source.close();
            source = null;
        }
        stopPyodideWorker();

        currentLanguage = payload.language || 'python';
        resetTerminal();
        resetPanels();
        $title.textContent = payload.title || ((languageNames[currentLanguage] || 'Code') + ' run');

        if (currentLanguage === 'html') {
            renderHtml(payload);
            return;
        }

        if (currentLanguage === 'python') {
            startPyodideRun(payload);
            return;
        }

        if (currentLanguage === 'c' || currentLanguage === 'cpp') {
            terminalLine('The C/C++ runtime has been removed from this Chromebook build. Use Python or HTML in the popup runtime.\n', 'stderr');
            return;
        }

        startServerRun(payload);
    }

    window.addEventListener('message', function (event) {
        if (event.origin !== window.location.origin ||
            !event.data ||
            (event.data.type !== 'codepad-run-code' && event.data.type !== 'codepad-run-python')) {
            return;
        }

        if (currentToken === event.data.token) {
            if (window.opener) {
                window.opener.postMessage({
                    type: 'codepad-runtime-accepted',
                    token: event.data.token
                }, window.location.origin);
            }
            return;
        }

        currentToken = event.data.token;

        if (window.opener) {
            window.opener.postMessage({
                type: 'codepad-runtime-accepted',
                token: currentToken
            }, window.location.origin);
        }

        startRun(event.data.payload || {});
    });

    $form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!currentSessionId || $input.disabled || !inputState || !inputBuffer) {
            return;
        }

        let value = $input.value;
        let encoded = inputEncoder.encode(value + '\n');

        if (encoded.length > inputBuffer.length) {
            terminalLine('Input line is too long for this runtime.\n', 'stderr');
            return;
        }

        terminalLine(value + '\n', 'stdin');
        $input.value = '';
        inputBuffer.fill(0);
        inputBuffer.set(encoded);
        Atomics.store(inputState, 1, encoded.length);
        Atomics.store(inputState, 0, 1);
        Atomics.notify(inputState, 0);
        setInputEnabled(false);
    });

    $stop.addEventListener('click', function () {
        if (currentLanguage === 'python') {
            terminalLine('\n[stopped]\n', 'stderr');
            stopPyodideWorker();
            return;
        }

        if (!currentSessionId) {
            return;
        }

        fetch(runtimeApiUrl('/api/runtime/' + encodeURIComponent(currentLanguage) + '/session/' + encodeURIComponent(currentSessionId)), {
            method: 'DELETE'
        }).catch(function () {});
    });

    window.addEventListener('beforeunload', function () {
        stopPyodideWorker();
    });

    resetTurtle();
    terminalLine('Run code from CodePad to start.\n', 'system');
    if (window.opener) {
        window.opener.postMessage({type: 'codepad-runtime-ready'}, window.location.origin);
    }

    let params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
        startRun({
            title: params.get('title') || 'Python run',
            code: params.get('code') || '',
            language: params.get('language') || 'python',
            timeoutMs: Number(params.get('timeoutMs') || 60000)
        });
    }
})();
