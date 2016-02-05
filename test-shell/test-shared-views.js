beginTest("SharedViews");

// Remember to include harness.js before this file.

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

    assertEq(view.buffer, sab);
    assertEq(view.length, sab.byteLength / View.BYTES_PER_ELEMENT);
    assertEq(view.byteOffset, 0);

    var half = sab.byteLength/2;
    var view2 = new View(sab, half);

    assertEq(view2.buffer, sab);
    assertEq(view2.length, half / View.BYTES_PER_ELEMENT);
    assertEq(view2.byteOffset, half)

    var view3 = new View(sab, View.BYTES_PER_ELEMENT, 5);

    assertEq(view3.buffer, sab);
    assertEq(view3.length, 5);
    assertEq(view3.byteOffset, View.BYTES_PER_ELEMENT);
}

////////////////////////////////////////////////////////////
//
// Basic element read/write.

for ( var View of int_views ) {
    var view = new View(sab, 8, 10);

    var tmp = new Uint8Array(sab, 8, 1);
    assertEq(tmp[0], 0);
    view[0] = -1;
    assertEq(tmp[0], 255);
    view[0] = 0;
    assertEq(tmp[0], 0);
}

var cuview = new Uint8ClampedArray(sab, 8, 10);
cuview[3] = 1;
assertEq(cuview[3], 1);
cuview[3] = -1;
assertEq(cuview[3], 0);
cuview[3] = 4711;
assertEq(cuview[3], 255);
cuview[3] = 0;

var f64view = new Float64Array(sab, 8, 10);
f64view[3] = Math.PI;
assertEq(f64view[3], Math.PI);
f64view[3] = 0;

var f32view = new Float32Array(sab, 8, 10);
f32view[0] = Math.PI;
assertEq(f32view[0], Math.fround(Math.PI));
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

finishTest("SharedViews");
