// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("atomics-on-good-arrays");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test atomic operations on arrays that allow atomic operations
---*/

var sab = new SharedArrayBuffer(1024);
var ab = new ArrayBuffer(16);

var int_views = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array];

for ( var idx=0 ; idx < int_views.length ; idx++ ) {
    var View = int_views[idx];

    // Make it interesting - use non-zero byteOffsets and non-zero indexes

    var view = new View(sab, 32, 20);

    assert.sameValue(Atomics.store(view, 3, 10), 10);
    assert.sameValue(Atomics.load(view, 3), 10);
    assert.sameValue(Atomics.exchange(view, 3, 5), 10);
    assert.sameValue(Atomics.load(view, 3), 5);
    assert.sameValue(Atomics.compareExchange(view, 3, 5, 8), 5);
    assert.sameValue(Atomics.load(view, 3), 8);
    assert.sameValue(Atomics.compareExchange(view, 3, 5, 16), 8);
    assert.sameValue(Atomics.load(view, 3), 8);

    assert.sameValue(Atomics.add(view, 8, 10), 0);  // 0 + 10 -> 10
    assert.sameValue(Atomics.sub(view, 8, 5), 10);  // 10 - 5 -> 5
    assert.sameValue(Atomics.and(view, 8, 3), 5);   // 5 & 3 -> 1
    assert.sameValue(Atomics.or(view, 8, 6), 1);    // 1 | 6 -> 7
    assert.sameValue(Atomics.xor(view, 8, 2), 7);   // 7 ^ 2 -> 5
    assert.sameValue(Atomics.load(view, 8), 5);     // 5

    // Rudimentary tests for sign extension and chopping.

    var control = new View(ab, 0, 2);
    var r;

    r = Atomics.store(view, 3, -5); control[0] = -5;
    assert.sameValue(r, -5);
    assert.sameValue(Atomics.load(view, 3), control[0]);
    assert.sameValue(Atomics.exchange(view, 3, 0), control[0]);
    view[3] = -5;
    assert.sameValue(Atomics.add(view, 3, 0), control[0]);
    assert.sameValue(Atomics.sub(view, 3, 0), control[0]);
    assert.sameValue(Atomics.and(view, 3, -1), control[0]);
    assert.sameValue(Atomics.or(view, 3, 0), control[0]);
    assert.sameValue(Atomics.xor(view, 3, 0), control[0]);
    control[1] = -7;
    assert.sameValue(Atomics.compareExchange(view, 3, control[0], -7), control[0]);
    assert.sameValue(Atomics.compareExchange(view, 3, control[0], -9), control[1]);
    assert.sameValue(view[3], control[1]);

    r = Atomics.store(view, 3, 12345); control[0] = 12345;
    assert.sameValue(r, 12345);
    assert.sameValue(Atomics.load(view, 3), control[0]);
    assert.sameValue(Atomics.exchange(view, 3, 0), control[0]);
    view[3] = 12345;
    assert.sameValue(Atomics.add(view, 3, 0), control[0]);
    assert.sameValue(Atomics.sub(view, 3, 0), control[0]);
    assert.sameValue(Atomics.and(view, 3, -1), control[0]);
    assert.sameValue(Atomics.or(view, 3, 0), control[0]);
    assert.sameValue(Atomics.xor(view, 3, 0), control[0]);
    control[1] = 23456;
    assert.sameValue(Atomics.compareExchange(view, 3, control[0], 23456), control[0]);
    assert.sameValue(Atomics.compareExchange(view, 3, control[0], 34567), control[1]);
    assert.sameValue(view[3], control[1]);

    r = Atomics.store(view, 3, 123456789); control[0] = 123456789;
    assert.sameValue(r, 123456789);
    assert.sameValue(Atomics.load(view, 3), control[0]);
    assert.sameValue(Atomics.exchange(view, 3, 0), control[0]);
    view[3] = 123456789;
    assert.sameValue(Atomics.add(view, 3, 0), control[0]);
    assert.sameValue(Atomics.sub(view, 3, 0), control[0]);
    assert.sameValue(Atomics.and(view, 3, -1), control[0]);
    assert.sameValue(Atomics.or(view, 3, 0), control[0]);
    assert.sameValue(Atomics.xor(view, 3, 0), control[0]);
    control[1] = 234567890;
    assert.sameValue(Atomics.compareExchange(view, 3, control[0], 234567890), control[0]);
    assert.sameValue(Atomics.compareExchange(view, 3, control[0], 345678901), control[1]);
    assert.sameValue(view[3], control[1]);

    r = Atomics.store(view, 3, Math.PI); control[0] = Math.PI;
    assert.sameValue(r, Math.PI);
    assert.sameValue(Atomics.load(view, 3), control[0]);
    assert.sameValue(Atomics.exchange(view, 3, 0), control[0]);

    // Do not affect memory outside the elements written.

    for ( var i=0 ; i < view.length ; i++ ) {
	if (i == 3 || i == 8)
	    continue;
	assert.sameValue(view[i], 0);
    }

    view[3] = 0;
    view[8] = 0;
}

// BEGIN EPILOGUE
finishTest("atomics-on-good-arrays");
// END EPILOGUE
