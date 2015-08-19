// Remember to include harness.js before this file.

var sab = new SharedArrayBuffer(1024);

// TODO: These are not the official view names, harness.js corrects
// for that but we should rename here once Firefox has been fixed.

var int_views = [SharedInt8Array, SharedUint8Array, SharedInt16Array, SharedUint16Array, SharedInt32Array, SharedUint32Array];

// TODO: SharedUint8ClampedArray in Firefox allows atomics
var other_views = [/*SharedUint8ClampedArray,*/ SharedFloat32Array, SharedFloat64Array];

// Test allowed atomic operations on integer views

for ( var View of int_views ) {
    var view = new View(sab);

    view[0] = 0;
    view[1] = 0;

    assertEq(Atomics.store(view, 0, 10), 10);
    assertEq(Atomics.load(view, 0), 10);
    assertEq(Atomics.exchange(view, 0, 5), 10);
    assertEq(Atomics.load(view, 0), 5);
    assertEq(Atomics.compareExchange(view, 0, 5, 8), 5);
    assertEq(Atomics.load(view, 0), 8);
    assertEq(Atomics.compareExchange(view, 0, 5, 16), 8);
    assertEq(Atomics.load(view, 0), 8);

    assertEq(Atomics.add(view, 1, 10), 0);  // 0 + 10 -> 10
    assertEq(Atomics.sub(view, 1, 5), 10);  // 10 - 5 -> 5
    assertEq(Atomics.and(view, 1, 3), 5);   // 5 & 3 -> 1
    assertEq(Atomics.or(view, 1, 6), 1);    // 1 | 6 -> 7
    assertEq(Atomics.xor(view, 1, 2), 7);   // 7 ^ 2 -> 5
    assertEq(Atomics.load(view, 1), 5);     // 5

    // TODO: tests for truncation and proper sign extension
}

// Test disallowed atomic operations on non-integer views

for ( var View of other_views ) {
    var view = new View(sab);

    expectException((() => Atomics.load(view, 0)), TypeError);
    expectException((() => Atomics.store(view, 0, 0)), TypeError);
    expectException((() => Atomics.exchange(view, 0, 0)), TypeError);
    expectException((() => Atomics.compareExchange(view, 0, 0, 0)), TypeError);
    expectException((() => Atomics.add(view, 0, 0)), TypeError);
    expectException((() => Atomics.sub(view, 0, 0)), TypeError);
    expectException((() => Atomics.and(view, 0, 0)), TypeError);
    expectException((() => Atomics.or(view, 0, 0)), TypeError);
    expectException((() => Atomics.xor(view, 0, 0)), TypeError);
}

// TODO: test that futex operations are disallowed on non-int32 arrays
// (but can't test in a shell test whether futex operations work)

// TODO: test isLockFree
