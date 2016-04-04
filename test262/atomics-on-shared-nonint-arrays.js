// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("atomics-on-shared-nonint-arrays");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test atomic operations on shared non-integer TypedArrays
---*/

var sab = new SharedArrayBuffer(1024);

var other_views = [Uint8ClampedArray, Float32Array, Float64Array];

for ( var View of other_views ) {
    var view = new View(sab);

    assert.throws(TypeError, (() => Atomics.load(view, 0)));
    assert.throws(TypeError, (() => Atomics.store(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.exchange(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.compareExchange(view, 0, 0, 0)));
    assert.throws(TypeError, (() => Atomics.add(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.sub(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.and(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.or(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.xor(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.wait(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.wake(view, 0)));
}

// BEGIN EPILOGUE
finishTest("atomics-on-shared-nonint-arrays");
// END EPILOGUE
