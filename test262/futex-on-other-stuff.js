// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

// BEGIN PROLOGUE
beginTest("futex-on-other-stuff");
// END PROLOGUE

/*---
es7id: TBD
description: >
  Test futex operations on values other than TypedArrays
---*/

var values = [null,
	      undefined,
	      true,
	      false,
	      new Boolean(true),
	      10,
	      3.14,
	      new Number(4),
	      "Hi there",
	      new Date,
	      /a*utomaton/g,
	      { password: "qumquat" },
	      new DataView(new ArrayBuffer(10)),
	      new ArrayBuffer(128),
	      new SharedArrayBuffer(128),
	      new Error("Ouch"),
	      [1,1,2,3,5,8],
	      ((x) => -x),
	      new Map(),
	      new Set(),
	      new WeakMap(),
	      new WeakSet(),
	      this.Promise ? new Promise(() => "done") : undefined,
	      Symbol("halleluja"),
	      // TODO: Proxy?
	      Object,
	      Int32Array,
	      Date,
	      Math,
	      Atomics ];

for ( var i=0 ; i < values.length ; i++ ) {
    var view = values[i];
    assert.throws(TypeError, (() => Atomics.wait(view, 0, 0)));
    assert.throws(TypeError, (() => Atomics.wake(view, 0)));
}

// BEGIN EPILOGUE
finishTest("futex-on-other-stuff");
// END EPILOGUE
