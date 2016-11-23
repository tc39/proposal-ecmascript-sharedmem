if (!this.SharedWorker)
    msg("FAILURE: SharedWorker not available");
else if (!this.SharedArrayBuffer)
    msg("FAILURE: Shared memory not available");
else
    runTest();

function runTest() {
    var w = new SharedWorker("sharing_window_and_sharedworker_worker.js");
    var sab = new SharedArrayBuffer(65536);

    w.port.onmessage = function (ev) {
	if (typeof ev.data == "object" && ev.data instanceof SharedArrayBuffer) {
	    msg("SHOULD NOT HAPPEN: Shared memory received in master\n" +
		"  datum=" + ev.data.constructor +
		"  length=" + ev.data.byteLength);
	}
	else
	    msg("" + ev.data);
    }

    // The following message should not be received by the worker because
    // it tries to transmit shared memory.

    try {
	w.port.postMessage(sab, [sab]);
    }
    catch (e) {
	msg("SUCCESS - Failed to send in master");
    }
}
