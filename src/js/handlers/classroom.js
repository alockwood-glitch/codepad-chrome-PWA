let ClassroomHandler = function () {

    this.Editors = undefined;
    this.Notifications = undefined;
    this.runtimeWindow = undefined;
    this.runtimeBuild = '20260612-6';

    this.languageByExtension = {
        py: 'python',
        python: 'python',
        html: 'html',
        htm: 'html',
        xhtml: 'html',
        c: 'c',
        h: 'c',
        cpp: 'cpp',
        cc: 'cpp',
        cxx: 'cpp',
        hpp: 'cpp',
        hxx: 'cpp',
        vb: 'vbscript',
        vbs: 'vbscript'
    };

    this.init = function (editors, notifications) {
        this.Editors = editors;
        this.Notifications = notifications;
        this.bindEvents();
    };

    this.bindEvents = function () {
        let that = this;

        $(document).on('click', '.action-run-code', function () {
            that.runActiveFile();
        });
    };

    this.getCurrentEditor = function () {
        return this.Editors ? this.Editors.getCurrentEditor() : undefined;
    };

    this.getActiveCode = function () {
        let editor = this.getCurrentEditor();

        if (typeof editor === typeof undefined) {
            return '';
        }

        return editor.getValue();
    };

    this.notify = function (type, title, message) {
        if (this.Notifications && typeof this.Notifications.notify === 'function') {
            this.Notifications.notify(type, title, message);
        } else {
            window.alert((title ? title + '\n' : '') + message);
        }
    };

    this.runActiveFile = function () {
        let code = this.getActiveCode();

        if (!code.trim()) {
            this.notify('warning', 'Run code', 'Nothing to run yet.');
            return;
        }

        let token = Date.now().toString() + Math.random().toString(36).slice(2);
        let runtimeWindow = window.open('about:blank', 'codepad-runtime', 'popup,width=1040,height=780');

        if (!runtimeWindow) {
            this.notify('danger', 'Run code', 'The browser blocked the output window. Allow pop-ups for CodePad and run again.');
            return;
        }

        runtimeWindow.location.href = '/src/html/runtime.html?v=' + encodeURIComponent(this.runtimeBuild) + '&t=' + encodeURIComponent(token);
        this.runtimeWindow = runtimeWindow;
        this.sendRunMessage(runtimeWindow, token, {
            code: code,
            language: this.getCurrentLanguage(),
            title: this.getCurrentTabName(),
            timeoutMs: 60000
        });
    };

    this.sendRunMessage = function (runtimeWindow, token, payload) {
        let attempts = 0;
        let timer = window.setInterval(function () {
            if (!runtimeWindow || runtimeWindow.closed) {
                window.clearInterval(timer);
                return;
            }

            runtimeWindow.postMessage({
                type: 'codepad-run-code',
                token: token,
                payload: payload
            }, window.location.origin);

            attempts++;
            if (attempts > 30) {
                window.clearInterval(timer);
            }
        }, 250);

        let acknowledge = function (event) {
            if (event.origin !== window.location.origin ||
                !event.data ||
                event.data.type !== 'codepad-runtime-accepted' ||
                event.data.token !== token) {
                return;
            }

            window.clearInterval(timer);
            window.removeEventListener('message', acknowledge);
        };

        window.addEventListener('message', acknowledge);
    };

    this.getCurrentTabName = function () {
        if (!this.Editors || typeof this.Editors.currentIdx === typeof undefined) {
            return 'CodePad run';
        }

        let $tab = this.Editors.getTabNavEl(this.Editors.currentIdx);
        if (!$tab || $tab.length === 0) {
            return 'CodePad run';
        }

        return $tab.find('.tab-name').first().text() || 'CodePad run';
    };

    this.getCurrentLanguage = function () {
        let name = this.getCurrentTabName();
        let parts = name.split('.');
        let extension = parts.length > 1 ? parts.pop().toLowerCase() : '';

        if (this.languageByExtension.hasOwnProperty(extension)) {
            return this.languageByExtension[extension];
        }

        let editor = this.getCurrentEditor();
        if (typeof editor !== typeof undefined) {
            let mode = editor.getOption('mode').split('/').pop().toLowerCase();
            if (this.languageByExtension.hasOwnProperty(mode)) {
                return this.languageByExtension[mode];
            }
        }

        return 'python';
    };
};
