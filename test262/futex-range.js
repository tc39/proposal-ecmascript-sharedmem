// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("futex-range");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test range checking of futex operations (on arrays that allow atomic operations)
---*/

var sab = new SharedArrayBuffer(4);
var view = new Int32Array(sab);

var bad_indices = [
    (view) => -1,
    (view) => view.length,
    (view) => view.length*2,
    (view) => undefined,
    (view) => '3.5',
    (view) => 3.5,
    (view) => ({ password: "qumquat" }),
    (view) => ({ valueOf: () => 125 }),
    (view) => ({ toString: () => '125', valueOf: false }) // non-callable valueOf triggers invocation of toString
];

for ( var iidx=0 ; iidx < bad_indices.length ; iidx++ ) {
    var Idx = bad_indices[iidx](view);
    assert.throws(RangeError, () => Atomics.wait(view, Idx, 10));
    assert.throws(RangeError, () => Atomics.wake(view, Idx));
}

var good_indices = [ (view) => 0/-1, // -0
		     (view) => '-0',
		     (view) => view.length - 1,
		     (view) => ({ valueOf: () => 0 }),
		     (view) => ({ toString: () => '0', valueOf: false }) // non-callable valueOf triggers invocation of toString
		   ];

for ( var iidx=0 ; iidx < good_indices.length ; iidx++ ) {
    var Idx = good_indices[iidx](view);
    //Atomics.wait(view, Idx, 10); // Will not block, but may throw on the main thread
    Atomics.wake(view, Idx);	 // Wakes none
}


// BEGIN EPILOGUE
finishTest("futex-range");
// END EPILOGUE
