importScripts("worker-harness.js");

var id;			        // Identity
var L;				// Next location to sleep on, incremented
var M;				// Location to count in, constant
var i32a;			// Shared Int32Array
var numworkers;
var iter;

onmessage =
    function (ev) {
	if (!ev.data)
	    return;
	var msg = ev.data;
	id = msg.id;
	L = msg.L;
	M = msg.M;
	var memory = msg.memory;
	numworkers = msg.numworkers;
	iter = msg.numiter;
	i32a = new Int32Array(memory);
	postMessage("Running " + id);
	setTimeout(compute, 0);
    };

function compute() {
    while (iter--) {
	v = Atomics.futexWait(i32a, L, 0, Number.POSITIVE_INFINITY);
	postMessage("HI FROM WORKER " + id);
	i32a[M]++;
	L = (L+1) % numworkers;
    }
}
