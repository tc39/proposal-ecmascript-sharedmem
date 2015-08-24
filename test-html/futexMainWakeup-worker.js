importScripts("worker-harness.js");

var mem;

onmessage = function (ev) {
    switch (ev.data[0]) {
    case "start":
	mem = new SharedInt32Array(ev.data[1]);
	break;
    case "run":
	setTimeout(function () {
	    postMessage("Worker: Waking it up now");
	    Atomics.futexWake(mem, 0, 1)
	}, ev.data[1]);
	break;
    }
}
