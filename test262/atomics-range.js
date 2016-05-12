// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("atomics-range");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test range checking of atomic operations (on arrays that allow atomic operations)
---*/

var sab = new SharedArrayBuffer(4);

var views = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array];

var bad_indices = [ (view) => -1,
		    (view) => view.length,
		    (view) => view.length*2,
		    (view) => undefined,
		    (view) => Number.NaN,
		    (view) => Number.POSITIVE_INFINITY,
		    (view) => Number.NEGATIVE_INFINITY,
		    (view) => '3.5',
		    (view) => 3.5,
		    (view) => { password: "qumquat" },
		    (view) => ({ valueOf: () => 125 }),
		    (view) => ({ toString: () => '125', valueOf: false }) // non-callable valueOf triggers invocation of toString
		  ];

for ( var vidx=0 ; vidx < views.length ; vidx++ ) {
    var View = views[vidx];
    var view = new View(sab);

    for ( var iidx=0 ; iidx < bad_indices.length ; iidx++ ) {
	var Idx = bad_indices[iidx](view);
	assert.throws(RangeError, () => Atomics.store(view, Idx, 10));
	assert.throws(RangeError, () => Atomics.load(view, Idx));
	assert.throws(RangeError, () => Atomics.exchange(view, Idx, 5));
	assert.throws(RangeError, () => Atomics.compareExchange(view, Idx, 5, 8));
	assert.throws(RangeError, () => Atomics.add(view, Idx, 10));
	assert.throws(RangeError, () => Atomics.sub(view, Idx, 5));
	assert.throws(RangeError, () => Atomics.and(view, Idx, 3));
	assert.throws(RangeError, () => Atomics.or(view, Idx, 6));
	assert.throws(RangeError, () => Atomics.xor(view, Idx, 2));
    }
}

var good_indices = [ (view) => 0/-1, // -0
		     (view) => '-0',
		     (view) => view.length - 1,
		     (view) => ({ valueOf: () => 0 }),
		     (view) => ({ toString: () => '0', valueOf: false }) // non-callable valueOf triggers invocation of toString
		   ];

for ( var vidx=0 ; vidx < views.length ; vidx++ ) {
    var View = views[vidx];
    var view = new View(sab);

    for ( var iidx=0 ; iidx < good_indices.length ; iidx++ ) {
	var Idx = good_indices[iidx](view);
	Atomics.store(view, Idx, 37);
	assert.sameValue(Atomics.load(view, Idx), 37);
	assert.sameValue(Atomics.exchange(view, Idx, 37), 37);
	assert.sameValue(Atomics.compareExchange(view, Idx, 37, 37), 37);
	assert.sameValue(Atomics.add(view, Idx, 0), 37);
	assert.sameValue(Atomics.sub(view, Idx, 0), 37);
	assert.sameValue(Atomics.and(view, Idx, -1), 37);
	assert.sameValue(Atomics.or(view, Idx, 0), 37);
	assert.sameValue(Atomics.xor(view, Idx, 0), 37);
    }
}

// BEGIN EPILOGUE
finishTest("atomics-range");
// END EPILOGUE
