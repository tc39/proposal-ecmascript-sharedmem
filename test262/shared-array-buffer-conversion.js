// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
es7id: TBD
description: >
  Test conversion of a SharedArrayBuffer object to various types
---*/

// BEGIN PROLOGUE
beginTest("shared-array-buffer-conversion");
// END PROLOGUE

var sab = new SharedArrayBuffer(1024);

assert.sameValue(String(sab), "[object SharedArrayBuffer]");

assert.sameValue(Number(sab), Number.NaN);

// BEGIN EPILOGUE
finishTest("shared-array-buffer-conversion");
// END EPILOGUE
