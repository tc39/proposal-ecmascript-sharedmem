// Remember to include harness.js before this file.

var sab = new SharedArrayBuffer(1024);

// TODO: These are not the official view names, harness.js corrects
// for that but we should rename here once Firefox has been fixed.

// int_views have well-behaved values & representations
var int_views = [SharedInt8Array, SharedUint8Array, SharedInt16Array, SharedUint16Array, SharedInt32Array, SharedUint32Array];

// other_views do not
var other_views = [SharedUint8ClampedArray, SharedFloat32Array, SharedFloat64Array];

////////////////////////////////////////////////////////////
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
// Basic element read/write.

for ( var View of int_views ) {
    var view = new View(sab, 8, 10);

    var tmp = new SharedUint8Array(sab, 8, 1);
    assertEq(tmp[0], 0);
    view[0] = -1;
    assertEq(tmp[0], 255);
    view[0] = 0;
    assertEq(tmp[0], 0);
}

// TODO: Check that the appropriate bytes in the SAB were affected

var cuview = new SharedUint8ClampedArray(sab, 8, 10);
cuview[3] = 1;
assertEq(cuview[3], 1);
cuview[3] = -1;
assertEq(cuview[3], 0);
cuview[3] = 4711;
assertEq(cuview[3], 255);
cuview[3] = 0;

var f64view = new SharedFloat64Array(sab, 8, 10);
f64view[3] = Math.PI;
assertEq(f64view[3], Math.PI);
f64view[3] = 0;

var f32view = new SharedFloat32Array(sab, 8, 10);
f32view[0] = Math.PI;
assertEq(f32view[0], Math.fround(Math.PI));
f32view[0] = 0;

////////////////////////////////////////////////////////////

// TODO:
// - TA methods perform correctly on shared memory
