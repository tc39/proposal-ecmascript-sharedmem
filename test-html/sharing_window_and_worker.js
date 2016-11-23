// A shared buffer is allocated in the worker, sent to the master, and
// sent back to the worker, which tests that it got the right buffer.

importScripts("worker-harness.js");

var sab = new SharedArrayBuffer(4096);

onmessage = function (ev) {
    if (ev.data === "START") {
	postMessage(sab, [sab]);
	return;
    }

    let newsab = ev.data;
    if (!(newsab instanceof SharedArrayBuffer)) {
	postMessage("Bad type");
	return;
    }
    if (newsab.byteLength != sab.byteLength) {
	postMessage("Bad length");
	return;
    }
    var t0 = new Int32Array(sab);
    var t1 = new Int32Array(newsab);
    t1[0] = 0xcafebabe;
    t0[0] = 0;
    if (t1[0] != 0) {
	postMessage("Not the same memory");
	return;
    }
    postMessage("SUCCESS");
}
