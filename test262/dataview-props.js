// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("dataview-props");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test the properties of DataView views on shared memory
---*/

var sab = new SharedArrayBuffer(1024);

// Create DataView on SharedArrayBuffer

var view = new DataView(sab);

assert.sameValue(view.buffer, sab);
assert.sameValue(view.byteLength, sab.byteLength);
assert.sameValue(view.byteOffset, 0);

var u8 = new Uint8Array(sab);

u8[1] = 1;
u8[2] = 2;

// Read value from DataView on SharedArrayBuffer

assert.sameValue(view.getUint16(1, true), 257);

// Write value to DataView on SharedArrayBuffer

view.setUint16(3, 257, true);
assert.sameValue(u8[3], 1);
assert.sameValue(u8[4], 2);

// BEGIN EPILOGUE
finishTest("dataview-props");
// END EPILOGUE
