// Testing mutual exclusion on SharedArrayBuffer - slave worker.
//
// Worker code:
//
// Each array element comprises 3 10-bit fields.  The final value of
// each element should be (iter << 20) | (iter << 10) | iter, if
// mutual exclusion works OK.
//
// To signal completion this one or's a bit into a bit vector at a
// known location.  This is crude but it works.  There are other ways.

importScripts("worker-harness.js",
	      "sharedMemCriticalSection_defs.js",
	      "sharedMemSimpleMutex.js");

var iter = 0;			// Global iteration counter

var id;				// Worker identity (0..workers-1)
var sia;			// Shared Int32Array
var m;				// Mutex

function compute() {
    if (iter == iterations) {
	postMessage("Finished: " + id);
	Atomics.or(sia, statusLoc, 1 << id);
	return;
    }

    iter++;
    if (doLock)
	m.lock();
    for ( var x=arrayLo ; x < arrayLim ; x++ )
	sia[x] += (1 << id*10);
    if (doLock)
	m.unlock();
    setTimeout(compute, 1);	// relax
}

onmessage = function (ev) {
    if (!ev.data)
	return;

    var msg = ev.data;
    id = msg.id;
    sia = new Int32Array(msg.sab);
    m = new Mutex(sia, mutexLoc);
    postMessage("Starting: " + id);
    setTimeout(compute, 0);
}
