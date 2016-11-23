// A shared buffer is allocated in the worker, sent to the nested worker, and
// sent back to the worker, which tests that it got the right buffer.

importScripts("worker-harness.js");

var sab = new SharedArrayBuffer(4096); // Don't change this length, the child knows about it
var nested_worker = new Worker("sharing_worker_and_nested_worker_child.js");

nested_worker.onmessage = function (ev) {
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

onmessage = function (ev) {
    if (ev.data === "START") {
	nested_worker.postMessage(sab, [sab]);
	return;
    }
}
