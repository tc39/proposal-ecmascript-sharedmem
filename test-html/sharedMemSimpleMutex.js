// Simple mutex semaphore abstraction.

// The mutex code is based on http://www.akkadia.org/drepper/futex.pdf
//
// Mutex state values:
//   0: unlocked
//   1: locked with no waiters
//   2: locked with possible waiters

// "sab" must be a shared Int32Array (mapped onto a SharedArrayBuffer).
// "index" must be a valid index in sab, reserved for the mutex.
// sab[index] must be initialized (globally) to 0 before the first mutex is created.

function Mutex(sab, index) {
    this.sab = sab;
    this.index = index;
}

Mutex.prototype.lock =
    function () {
	const sab = this.sab;
	const index = this.index;
	var c;
	if ((c = Atomics.compareExchange(sab, index, 0, 1)) != 0) {
	    do {
		if (c == 2 || Atomics.compareExchange(sab, index, 1, 2) != 0)
		    Atomics.wait(sab, index, 2, Number.POSITIVE_INFINITY);
	    } while ((c = Atomics.compareExchange(sab, index, 0, 2)) != 0);
	}
    };

Mutex.prototype.unlock =
    function () {
	const sab = this.sab;
	const index = this.index;
	var v0 = Atomics.sub(sab, index, 1);
	// Wake up a waiter if there are any
	if (v0 != 1) {
	    Atomics.store(sab, index, 0);
	    Atomics.wake(sab, index, 1);
	}
    };
