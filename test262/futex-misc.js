// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("futex-misc");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test miscellaneous aspects of futex operations
---*/

var sab = new SharedArrayBuffer(4);
var view = new Int32Array(sab);

// Testing the actual functioning of these requires workers, see
// ../test-html/ for more test cases.

// Legal corner cases for Atomics.wake().

assert.sameValue(Atomics.wake(view, 0, -3), 0);
assert.sameValue(Atomics.wake(view, 0, Number.POSITIVE_INFINITY), 0);
assert.sameValue(Atomics.wake(view, 0), 0);

// BEGIN EPILOGUE
finishTest("futex-misc");
// END EPILOGUE
