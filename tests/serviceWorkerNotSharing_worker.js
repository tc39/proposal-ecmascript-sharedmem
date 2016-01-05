onfetch = function (ev) {
    ev.respondWith(new Response("Hi there", { status: 200, statusText: "OK" }));
}

var theMaster = null;

onmessage = function (ev) {
    if (ev.data === "hello")
	theMaster = ev.source;
    else {
	if (ev.data instanceof SharedArrayBuffer) {
	    if (ev.data.byteLength == 236) {
		theMaster.postMessage("OK: Worker received SAB of length 236");

		// Now update the supposedly shared memory so that the
		// master can check whether the memory is actually shared.
		// The master will perform the check once it receives a
		// message in return, below.

		let ia = new Int32Array(ev.data);
		ia[37] = 0xdeadbeef;
		ia[42] = 0xcafebabe;
	    }
	    else
		theMaster.postMessage("ERROR: ServiceWorker received a SharedArrayBuffer instance with unexpected length=" +
				      ev.data.byteLength);
	}
	else
	    theMaster.postMessage("ERROR: ServiceWorker received unexpected data: " + ev.data);
	setTimeout(() => sendToMaster(false), 1000);
    }
}

// Fallback: if nothing is received from the master, try to send a SAB
// to it - to see if perhaps transmission is only blocked in one
// direction.
setTimeout(() => sendToMaster(true), 5000);

var sent = false;

function sendToMaster(didTimeout) {
    if (sent)
	return;
    sent = true;
    var sab = new SharedArrayBuffer(200);
    try {
	if (didTimeout)
	    theMaster.postMessage("# Timed out waiting for a message from master");
	theMaster.postMessage("# Sending SAB of length 200 to master");
	theMaster.postMessage(sab, [sab]);
	theMaster.postMessage("# Did send SAB to master without exception");
	setTimeout(function () {
	    let ia = new Int32Array(sab);
	    if (ia[12] != (0xdeadbeef|0) || ia[33] != (0xcafebabe|0))
		theMaster.postMessage("ERROR: The master did not properly update the worker's shared memory" +
				      ia[12].toString(16) + " " + ia[33].toString(16));
	    else
		theMaster.postMessage("OK: Master's modifications are visible in the worker");
	}, 1000);
    } catch (e) {
	    theMaster.postMessage("EXCEPTION SEEN: postMessage from worker to master: " + e);
    }
}
