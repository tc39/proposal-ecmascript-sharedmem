if (!this.SharedArrayBuffer)
    msg("Can't run: No SharedArrayBuffer");
else if (!navigator.serviceWorker)
    msg("Can't run: No ServiceWorker");
else
    runTest();

function runTest() {
    var theWorker = null;
    var sab = new SharedArrayBuffer(236); // Non-random length

    navigator.serviceWorker.addEventListener('message', function (ev) {
	if (ev.data instanceof SharedArrayBuffer) {
	    if (ev.data.byteLength == 200) {
		msg("Master received a SharedArrayBuffer as expected");

		// Modify the memory we just received so that the worker can check.
		let ia2 = new Int32Array(ev.data);
		ia2[12] = 0xdeadbeef;
		ia2[33] = 0xcafebabe;
	    }
	    else
		msg("ERROR: Master received a SharedArrayBuffer instance with unexpected length=" + ev.data.byteLength);

	    // The worker believed it got a shared buffer, or we wouldn't be here.
	    // See if the worker modified the shared memory the master sent.
	    let ia = new Int32Array(sab);
	    if (ia[37] != 0xdeadbeef || ia[42] != 0xcafebabe)
		msg("ERROR: Memory not properly shared");
	    else
		msg("Worker's modifications are visible in the master as expected");
	}
	else if (typeof ev.data == "string")
	    msg(ev.data);
	else
	    msg("ERROR: Master received unexpected data: " + ev.data);
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
		try {
                    msg("Sending message from master to worker now");
                    theWorker.postMessage(sab, [sab]);
		    msg("Sending did not throw an error");
		}
		catch (e) {
		    msg("EXCEPTION SEEN: postMessage from master to worker:\n" + e);
		}
            }, 1000);
        }
    }).catch(function (error) {
        msg("Can't run: Registration failed with " + error);
    });
}
