(function () {
    "use strict";

    if (!("serviceWorker" in navigator)) {
        return;
    }

    window.addEventListener("load", function () {
        navigator.serviceWorker.register("/sw.js", {scope: "/"})
            .then(function () {
                document.documentElement.setAttribute("data-codepad-service-worker", "registered");
            })
            .catch(function (err) {
                document.documentElement.setAttribute("data-codepad-service-worker", "failed");
                console.info("Service worker registration failed", err);
            });
    });
})();
