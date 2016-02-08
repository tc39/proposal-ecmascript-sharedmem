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
var indices = [ (view) => -1,
		(view) => view.length,
		(view) => view.length*2,
		(view) => undefined,
		(view) => '3.5',
		(view) => { password: "qumquat" } ];

for ( var vidx=0 ; vidx < views.length ; vidx++ ) {
    var View = views[vidx];
    var view = new View(sab);

    for ( var iidx=0 ; iidx < indices.length ; iidx++ ) {
	var Idx = indices[iidx](view);
	assert.throws(RangeError, () => Atomics.store(view, Idx, 10));
	assert.throws(RangeError, () => Atomics.load(view, Idx));
	assert.throws(RangeError, () => Atomics.exchange(view, Idx, 5));
	assert.throws(RangeError, () => Atomics.compareExchange(view, Idx, 5, 8));
	assert.throws(RangeError, () => Atomics.add(view, 8, 10));
	assert.throws(RangeError, () => Atomics.sub(view, 8, 5));
	assert.throws(RangeError, () => Atomics.and(view, 8, 3));
	assert.throws(RangeError, () => Atomics.or(view, 8, 6));
	assert.throws(RangeError, () => Atomics.xor(view, 8, 2));
    }
}

// BEGIN EPILOGUE
finishTest("atomics-range");
// END EPILOGUE
