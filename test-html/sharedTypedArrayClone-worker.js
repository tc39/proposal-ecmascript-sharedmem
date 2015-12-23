importScripts("worker-harness.js");

var state = 0;
var sab;

onmessage = function (ev) {
    if (ev.data === "start") {
	postMessage("ready");
	return;
    }
    switch (state) {
    case 0:
	if (!(ev.data instanceof SharedArrayBuffer))
	    postMessage("ERROR: 0: Not SharedArrayBuffer");
	if (ev.data.byteLength != 4)
	    postMessage("ERROR: 0: Length wrong: " + ev.data.byteLength);
	postMessage("0: OK");
	sab = ev.data;		// This will be the same memory we receive next
	state++;
	break;
    case 1:
	if (!(ev.data instanceof Int32Array))
	    postMessage("ERROR: 1: Not shared Int32Array");
	if (ev.data.length != 1)
	    postMessage("ERROR: 1: Length wrong: " + ev.data.length);
	ev.data[0] = 1337;
	if ((new Int32Array(sab))[0] != 1337)
	    postMessage("ERROR: 1: Not the same memory");
	postMessage("1: OK");
	state++;
	break;
    default:
	postMessage("Unknown state: " + state);
	break;
    }
}
