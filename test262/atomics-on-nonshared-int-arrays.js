// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("atomics-on-nonshared-int-arrays");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test atomic operations on non-shared integer TypedArrays
---*/

var ab = new ArrayBuffer(16);

var int_views = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array];

for ( var View of int_views ) {
    var view = new View(ab);

    assert.throws(TypeError, (() => Atomics.load(view, 0)));
    assert.throws(TypeError, (() => Atomics.store(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.exchange(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.compareExchange(view, 0, 0, 0)));
    assert.throws(TypeError, (() => Atomics.add(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.sub(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.and(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.or(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.xor(view, 0, 0)));
}

// BEGIN EPILOGUE
finishTest("atomics-on-nonshared-int-arrays");
// END EPILOGUE
