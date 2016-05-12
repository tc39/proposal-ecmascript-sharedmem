// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("futex-on-nonshared-int-arrays");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test futex operations on non-shared integer TypedArrays
---*/

var ab = new ArrayBuffer(16);

var int_views = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array];

for ( var View of int_views ) {
    var view = new View(ab);

    assert.throws(TypeError, (() => Atomics.wait(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.wake(view, 0)));
}

// BEGIN EPILOGUE
finishTest("futex-on-nonshared-int-arrays");
// END EPILOGUE
