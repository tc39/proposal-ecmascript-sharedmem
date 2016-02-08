// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("typedarray-props-range");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test out-of-range access on typed array views on shared memory
---*/

var sab = new SharedArrayBuffer(8);

var views = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array,
	     Uint8ClampedArray, Float64Array, Float32Array];

var i = 0;
for ( var View of views ) {
    var view = new View(sab);

    // Note, non-index numbers are added as expandos, so avoid those.

    // No exception should be thrown here

    assert.sameValue(view[-1] = 5, 5);
    assert.sameValue(view[view.length] = 5, 5);
    assert.sameValue(view['10000'] = 5, 5);

    // Nor exceptions here

    assert.sameValue(view[-1], undefined);
    assert.sameValue(view[view.length], undefined);
    assert.sameValue(view['10000'], undefined);
}

// BEGIN EPILOGUE
finishTest("typedarray-props-range");
// END EPILOGUE
