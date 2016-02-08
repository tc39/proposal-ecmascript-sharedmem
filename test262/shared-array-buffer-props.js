// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
es7id: TBD
description: >
  Test properties of the SharedArrayBuffer object
---*/

// BEGIN PROLOGUE
beginTest("shared-array-buffer-props");
// END PROLOGUE

assert.sameValue(typeof SharedArrayBuffer.isView, "function");
assert.sameValue(typeof SharedArrayBuffer.prototype, "object");
assert.sameValue(typeof SharedArrayBuffer.prototype == null, false);

// BEGIN EPILOGUE
finishTest("shared-array-buffer-props");
// END EPILOGUE
