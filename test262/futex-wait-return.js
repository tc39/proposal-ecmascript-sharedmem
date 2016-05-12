// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("futex-wait-return");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test some return values of Atomics.wait()
---*/

var sab = new SharedArrayBuffer(4);
var view = new Int32Array(sab);

// Testing for "ok" requires workers, see ../test-html/ for more test
// cases.

assert.sameValue(Atomics.wait(view, 0, 42), "not-equal");
assert.sameValue(Atomics.wait(view, 0, 0, 100), "timed-out");

// BEGIN EPILOGUE
finishTest("futex-wait-return");
// END EPILOGUE
