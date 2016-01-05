onfetch = function (ev) {
    ev.respondWith(new Response("Hi there", { status: 200, statusText: "OK" }));
}

onmessage = function (ev) {
    if (ev.data instanceof SharedArrayBuffer) {
	if (ev.data.byteLength = 236) {
	    ev.source.postMessage("ServiceWorker received a SharedArrayBuffer as expected");
	    let ia = new Int32Array(ev.data);
	    ia[37] = 0xdeadbeef;
	    ia[42] = 0xcafebabe;
	}
	else
	    ev.source.postMessage("ERROR: ServiceWorker received a SharedArrayBuffer instance with unexpected length=" + ev.data.byteLength);
    else
	ev.source.postMessage("ERROR: ServiceWorker received unexpected data: " + ev.data);

    var sab = new SharedArrayBuffer(200);
    setTimeout(function () {
	try {
	    ev.source.postMessage("Will send SAB of length 200 from worker to master");
	    ev.source.postMessage(sab, [sab]);
	    ev.source.postMessage("Did send SAB from worker to master without exception");
	    setTimeout(function () {
		let ia = new Int32Array(sab);
		if (ia[12] != 0xdeadbeef || ia[33] != 0xcafebabe)
		    ev.source.postMessage("ERROR: The master did not properly update the worker's shared memory");
		else
		    ev.source.postMessage("Master's modifications are visible in the worker as expected");
	    }, 1000);
	} catch (e) {
	    ev.source.postMessage("EXCEPTION SEEN: postMessage from worker to master: " + e);
    }, 1000);
}
