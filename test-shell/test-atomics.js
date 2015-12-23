// Remember to include harness.js before this file.

var sab = new SharedArrayBuffer(1024);
var ab = new ArrayBuffer(16);

var int_views = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array];

var other_views = [Uint8ClampedArray, Float32Array, Float64Array];

// Test allowed atomic operations on integer views

for ( var idx=0 ; idx < int_views.length ; idx++ ) {
    var View = int_views[idx];

    // Make it interesting - use non-zero byteOffsets and non-zero indexes

    var view = new View(sab, 32, 20);

    assertEq(Atomics.store(view, 3, 10), 10);
    assertEq(Atomics.load(view, 3), 10);
    assertEq(Atomics.exchange(view, 3, 5), 10);
    assertEq(Atomics.load(view, 3), 5);
    assertEq(Atomics.compareExchange(view, 3, 5, 8), 5);
    assertEq(Atomics.load(view, 3), 8);
    assertEq(Atomics.compareExchange(view, 3, 5, 16), 8);
    assertEq(Atomics.load(view, 3), 8);

    assertEq(Atomics.add(view, 8, 10), 0);  // 0 + 10 -> 10
    assertEq(Atomics.sub(view, 8, 5), 10);  // 10 - 5 -> 5
    assertEq(Atomics.and(view, 8, 3), 5);   // 5 & 3 -> 1
    assertEq(Atomics.or(view, 8, 6), 1);    // 1 | 6 -> 7
    assertEq(Atomics.xor(view, 8, 2), 7);   // 7 ^ 2 -> 5
    assertEq(Atomics.load(view, 8), 5);     // 5

    // Rudimentary tests for sign extension and chopping.

    var control = new View(ab, 0, 2);

    Atomics.store(view, 3, -5); control[0] = -5;
    assertEq(Atomics.load(view, 3), control[0]);
    assertEq(Atomics.exchange(view, 3, 0), control[0]);
    view[3] = -5;
    assertEq(Atomics.add(view, 3, 0), control[0]);
    assertEq(Atomics.sub(view, 3, 0), control[0]);
    assertEq(Atomics.and(view, 3, -1), control[0]);
    assertEq(Atomics.or(view, 3, 0), control[0]);
    assertEq(Atomics.xor(view, 3, 0), control[0]);
    control[1] = -7;
    assertEq(Atomics.compareExchange(view, 3, control[0], -7), control[0]);
    assertEq(Atomics.compareExchange(view, 3, control[0], -9), control[1]);
    assertEq(view[3], control[1]);

    Atomics.store(view, 3, 12345); control[0] = 12345;
    assertEq(Atomics.load(view, 3), control[0]);
    assertEq(Atomics.exchange(view, 3, 0), control[0]);
    view[3] = 12345;
    assertEq(Atomics.add(view, 3, 0), control[0]);
    assertEq(Atomics.sub(view, 3, 0), control[0]);
    assertEq(Atomics.and(view, 3, -1), control[0]);
    assertEq(Atomics.or(view, 3, 0), control[0]);
    assertEq(Atomics.xor(view, 3, 0), control[0]);
    control[1] = 23456;
    assertEq(Atomics.compareExchange(view, 3, control[0], 23456), control[0]);
    assertEq(Atomics.compareExchange(view, 3, control[0], 34567), control[1]);
    assertEq(view[3], control[1]);

    Atomics.store(view, 3, 123456789); control[0] = 123456789;
    assertEq(Atomics.load(view, 3), control[0]);
    assertEq(Atomics.exchange(view, 3, 0), control[0]);
    view[3] = 123456789;
    assertEq(Atomics.add(view, 3, 0), control[0]);
    assertEq(Atomics.sub(view, 3, 0), control[0]);
    assertEq(Atomics.and(view, 3, -1), control[0]);
    assertEq(Atomics.or(view, 3, 0), control[0]);
    assertEq(Atomics.xor(view, 3, 0), control[0]);
    control[1] = 234567890;
    assertEq(Atomics.compareExchange(view, 3, control[0], 234567890), control[0]);
    assertEq(Atomics.compareExchange(view, 3, control[0], 345678901), control[1]);
    assertEq(view[3], control[1]);

    Atomics.store(view, 3, Math.PI); control[0] = Math.PI;
    assertEq(Atomics.load(view, 3), control[0]);
    assertEq(Atomics.exchange(view, 3, 0), control[0]);

    // Do not affect memory outside the elements written.

    for ( var i=0 ; i < view.length ; i++ ) {
	if (i == 3 || i == 8)
	    continue;
	assertEq(view[i], 0);
    }

    view[3] = 0;
    view[8] = 0;
}

// Test disallowed atomic operations on non-integer shared views - these should throw.

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

// Test disallowed atomic operations on non-shared integer views - these should throw.

for ( var View of int_views ) {
    var view = new View(ab);

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

// Test that futex operations are disallowed on non-int32 shared arrays.

for ( var View of int_views ) {
    if (View == Int32Array)
	continue;
    testFutexDisallowed(View, sab);
}

for ( var View of other_views )
    testFutexDisallowed(View, sab);

for ( var View of int_views )
    testFutexDisallowed(View, ab);

function testFutexDisallowed(View, ab) {
    var view = new View(ab);
    expectException((() => Atomics.futexWait(view, 0, 0)), TypeError);
    expectException((() => Atomics.futexWake(view, 0, 1)), TypeError);
    expectException((() => Atomics.futexWakeOrRequeue(view, 0, 1, 1, 0)), TypeError);
}

// Test isLockFree.

var sizes   = [    1,     2,     3,     4,     5,     6,     7,  8,
                   9,    10,    11,    12];
var answers = [   {},    {}, false,    {}, false, false, false, {},
	       false, false, false, false];

function testIsLockFree() {
    var saved = {};

    // This should defeat most optimizations.

    for ( var i=0 ; i < sizes.length ; i++ ) {
	var v = Atomics.isLockFree(sizes[i]);
	var a = answers[i];
	assertEq(typeof v, 'boolean');
	if (typeof a == 'boolean')
	    assertEq(v, a);
	else
	    saved[sizes[i]] = v;
    }

    // This ought to be optimizable.  Make sure the answers are the same
    // as for the unoptimized case.

    assertEq(Atomics.isLockFree(1), saved[1]);
    assertEq(Atomics.isLockFree(2), saved[2]);
    assertEq(Atomics.isLockFree(3), false);
    assertEq(Atomics.isLockFree(4), saved[4]);
    assertEq(Atomics.isLockFree(5), false);
    assertEq(Atomics.isLockFree(6), false);
    assertEq(Atomics.isLockFree(7), false);
    assertEq(Atomics.isLockFree(8), saved[8]);
    assertEq(Atomics.isLockFree(9), false);
    assertEq(Atomics.isLockFree(10), false);
    assertEq(Atomics.isLockFree(11), false);
    assertEq(Atomics.isLockFree(12), false);
}

testIsLockFree();

