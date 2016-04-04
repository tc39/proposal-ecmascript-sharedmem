importScripts("worker-harness.js");

var mem;

onmessage = function (ev) {
    switch (ev.data[0]) {
    case "start":
	mem = new Int32Array(ev.data[1]);
	break;
    case "run":
	setTimeout(function () {
	    postMessage("Worker: Waking it up now");
	    Atomics.wake(mem, 0, 1)
	}, ev.data[1]);
	break;
    }
}
