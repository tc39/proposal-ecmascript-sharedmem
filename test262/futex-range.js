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

// TODO: also test good boundary case indices, see atomics-range.js for an example.

var indices = [ (view) => -1,
		(view) => view.length,
		(view) => view.length*2,
		(view) => undefined,
		(view) => '-0',
		(view) => '3.5',
		(view) => 3.5,
		(view) => { password: "qumquat" } ];

for ( var iidx=0 ; iidx < indices.length ; iidx++ ) {
    var Idx = indices[iidx](view);
    assert.throws(RangeError, () => Atomics.wait(view, Idx, 10));
    assert.throws(RangeError, () => Atomics.wake(view, Idx));
}

// BEGIN EPILOGUE
finishTest("futex-range");
// END EPILOGUE
