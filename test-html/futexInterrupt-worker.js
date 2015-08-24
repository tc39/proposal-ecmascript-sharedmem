importScripts("worker-harness.js");

onmessage =
    function (ev) {
	var iab = new SharedInt32Array(ev.data);
	Atomics.futexWait(iab, 0, 0, Number.POSITIVE_INFINITY);
	postMessage("THIS SHOULD NOT HAPPEN");
    };
