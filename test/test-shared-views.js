// Remember to include harness.js before this file.

var sab = new SharedArrayBuffer(1024);

// TODO: These are not the official view names, harness.js corrects
// for that but we should rename here once Firefox has been fixed.

var views = [SharedInt8Array, SharedUint8Array, SharedInt16Array, SharedUint16Array, SharedInt32Array, SharedUint32Array,
	     SharedUint8ClampedArray, SharedFloat32Array, SharedFloat64Array];

// Test that the views can be constructed on shared memory and that
// the memory extracted from the views is the original shared buffer,
// and other basic things.

for ( var View of views ) {
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
