// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
es7id: TBD
description: >
  Test properties and methods of the SharedArrayBuffer instances
---*/

// BEGIN PROLOGUE
beginTest("shared-array-buffer-instance-props");
// END PROLOGUE

var sab = new SharedArrayBuffer(1024);

assert.sameValue(sab.byteLength, 1024);

assert.sameValue(sab.constructor, SharedArrayBuffer);

assert.sameValue(sab.slice, SharedArrayBuffer.prototype.slice);

assert.sameValue(typeof sab.slice, "function");

// Not implemented in Firefox 46
if (sab.slice) {
    // TODO: test SharedArrayBuffer.prototype.slice
}

// BEGIN EPILOGUE
finishTest("shared-array-buffer-instance-props");
// END EPILOGUE
