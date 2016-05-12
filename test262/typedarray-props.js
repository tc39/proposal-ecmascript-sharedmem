// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("typedarray-props");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test the properties of typed array views on shared memory
---*/

var sab = new SharedArrayBuffer(1024);

var int_views = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array];

var other_views = [Uint8ClampedArray, Float32Array, Float64Array];

//////////////////////////////////////////////////////////////////////
//
// Test that the views can be constructed on shared memory and that
// the memory extracted from the views is the original shared buffer,
// and other basic things.

for ( var View of int_views )
    testView(View);

for ( var View of other_views )
    testView(View);

function testView(View) {
    var view = new View(sab);

    assert.sameValue(view.buffer, sab);
    assert.sameValue(view.length, sab.byteLength / View.BYTES_PER_ELEMENT);
    assert.sameValue(view.byteOffset, 0);

    var half = sab.byteLength/2;
    var view2 = new View(sab, half);

    assert.sameValue(view2.buffer, sab);
    assert.sameValue(view2.length, half / View.BYTES_PER_ELEMENT);
    assert.sameValue(view2.byteOffset, half)

    var view3 = new View(sab, View.BYTES_PER_ELEMENT, 5);

    assert.sameValue(view3.buffer, sab);
    assert.sameValue(view3.length, 5);
    assert.sameValue(view3.byteOffset, View.BYTES_PER_ELEMENT);
}

////////////////////////////////////////////////////////////
//
// Basic element read/write.

for ( var View of int_views ) {
    var view = new View(sab, 8, 10);

    var tmp = new Uint8Array(sab, 8, 1);
    assert.sameValue(tmp[0], 0);
    view[0] = -1;
    assert.sameValue(tmp[0], 255);
    view[0] = 0;
    assert.sameValue(tmp[0], 0);
}

var cuview = new Uint8ClampedArray(sab, 8, 10);
cuview[3] = 1;
assert.sameValue(cuview[3], 1);
cuview[3] = -1;
assert.sameValue(cuview[3], 0);
cuview[3] = 4711;
assert.sameValue(cuview[3], 255);
cuview[3] = 0;

var f64view = new Float64Array(sab, 8, 10);
f64view[3] = Math.PI;
assert.sameValue(f64view[3], Math.PI);
f64view[3] = 0;

var f32view = new Float32Array(sab, 8, 10);
f32view[0] = Math.PI;
assert.sameValue(f32view[0], Math.fround(Math.PI));
f32view[0] = 0;

////////////////////////////////////////////////////////////

// TypedArray methods:
//
// All existing TypedArray methods should work the same (in a
// single-threaded setting) if the underlying buffer is a shared
// buffer, so I'm delegating most functional tests to existing test
// suites (that will have to be adapted mildly).

// The spec has a change to the set() method to prevent overwriting
// elements when the underlying memory of two SharedArrayBuffers is
// the same (as can happen if a SAB is sent to another agent and then
// back to the first one; we end up with two SAB objects that
// reference the same memory).  That change can't be tested in a
// shell, it needs to be tested in a browser.


// BEGIN EPILOGUE
finishTest("typedarray-props");
// END EPILOGUE
