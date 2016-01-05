// The SharedArrayBuffer is available in the SharedWorker, and shared
// memory can be created, it just can't be shared.  This makes
// slightly more sense than making the APIs unavailable because it
// allows for code reuse in the absence of active sharing.

onconnect = function (ev) {
    var port = ev.ports[0];
    port.onmessage = function (ev) {
	if (ev.data instanceof SharedArrayBuffer)
	    port.postMessage("SHOULD NOT HAPPEN: Shared memory received in worker\n" +
			     "  datum=" + ev.data.constructor + "\n" +
			     "  length=" + ev.data.byteLength);
	else
	    port.postMessage("Random data received in worker: " + ev.data);
    };

    var sab = new SharedArrayBuffer(100);

    // The following message should not be received by the master because it
    // tries to transmit shared memory.

    setTimeout(function () {
	try {
	    port.postMessage(sab, [sab]);
	} catch (e) {
	    port.postMessage("SUCCESS - Failed to send in worker");
	}
    }, 1000);
}
