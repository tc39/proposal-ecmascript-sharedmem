// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("futex-on-shared-nonint32-arrays");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test atomic operations on shared non-int32 arrays
---*/

var sab = new SharedArrayBuffer(16);

var int_views = [Int8Array, Uint8Array, Int16Array, Uint16Array, Uint32Array];

for ( var View of int_views ) {
    var view = new View(sab);

    assert.throws(TypeError, (() => Atomics.wait(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.wake(view, 0)));
}

// BEGIN EPILOGUE
finishTest("futex-on-shared-nonint32-arrays");
// END EPILOGUE
