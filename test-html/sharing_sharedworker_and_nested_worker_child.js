// A shared buffer is allocated in the worker, sent to the child, and
// sent back to the worker, which tests that it got the right buffer.

importScripts("worker-harness.js");

onmessage = function (ev) {
    let newsab = ev.data;
    if (!(newsab instanceof SharedArrayBuffer)) {
	postMessage("Bad type in child");
	return;
    }
    if (newsab.byteLength != 4096) {
	postMessage("Bad length in child");
	return;
    }
    postMessage(newsab);
}
