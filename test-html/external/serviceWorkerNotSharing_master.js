if (!this.SharedArrayBuffer)
    msg("No SharedArrayBuffer");
else if (!navigator.serviceWorker)
    msg("No ServiceWorker");
else
    runTest();

function runTest() {
    var theWorker = null;

    var sab = new SharedArrayBuffer(100);

    navigator.serviceWorker.addEventListener('message', function (ev) {
        console.log("Got a response: " + ev.data);
    });

    navigator.serviceWorker.register('/ecmascript_sharedmem/tests/serviceWorkerNotSharing_worker.js',
				     { scope: '/ecmascript_sharedmem/tests/dummy/' }).then(function (reg) {
        if (reg.installing)
            theWorker = reg.installing;
        else if (reg.waiting)
            theWorker = reg.waiting;
        else if (reg.active)
            theWorker = reg.active;

        if (theWorker) {
            setTimeout(function () {
                console.log("Sending message now");
                // This needs to fail, eventually.
                theWorker.postMessage(sab, [sab]);
            }, 1000);
        }
    }).catch(function (error) {
        console.log("Registration failed with " + error);
    });
}






