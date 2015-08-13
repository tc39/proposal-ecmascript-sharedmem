# Shared memory - a brief tutorial

## Concurrent agents

The specification leaves undefined what kinds of concurrent agents there might be (that can share memory) and how they are created and managed.  In a browser setting it's most natural to use WebWorkers for shared agents, and I'll assume that in the following.

To recap, workers are created by allocating ```Worker``` objects, passing a URL of the script to be loaded into the worker:
```js
   var w = new Worker("myworker.js")
```
The worker and its creator communicate over a message channel.  In the creator, ```w.postMessage("hi")``` sends the string "hi" to the worker.  Meanwhile, in the worker, a message handler receives that string as the data value of a normal event object:
```js
onmessage = function (ev) {
    console.log(ev.data);  // prints "hi"
}
```

## Allocating shared memory, and sharing it

To allocate shared memory, simply allocate a SharedArrayBuffer:

```js
   var sab = new SharedArrayBuffer(1024);  // 1KiB shared memory
```

The creator can share this memory with the worker by *transfering* it using the standard ```postMessage``` syntax, where a second argument to ```postMessage``` contains the values to be transfered:
```js
   w.postMessage(sab, [sab])
```
In the worker, this object is again received as the data property of the event:
```js
var sab;
onmessage = function (ev) {
   sab = ev.data;  // 1KiB shared memory, the same memory as in the parent
}
```

## Creating views on shared memory

A SharedArrayBuffer is like an ArrayBuffer, apart from its memory being shared, and the memory is accessed in the same way as an ArrayBuffer's memory is: by creating views on the buffer, and then accessing the memory via the view.  The same view types can be applied to SharedArrayBuffer as to ArrayBuffer, from Int8Array to Float64Array.

Suppose the creator of the shared memory wants to share a large constant array of prime numbers with its workers.  It allocates the memory and then fills it:

```js
var sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 100000); // 100000 primes
var ia = new Int32Array(sab);  // ia.length == 100000
var primes = new PrimeGenerator();
for ( let i=0 ; i < ia.length ; i++ )
   ia[i] = primes.next();
w.postMessage(ia, [ia.buffer]);  // The SharedArrayBuffer must be in the transfer list, not the Int32Array
```

The worker receives the array as usual (here it receives an Int32Array because that's what was sent):

```js
var ia;
onmessage = function (ev) {
  ia = ev.data;  // ia.length == 100000
}
```

## Updating shared memory, and visibility

As we saw in the previous section, shared memory can be written to using standard assignment syntax.  It can be written from any agent that has access to the memory, and the change will be observed in all the other agents:

```js
console.log(ia[37]);  // Prints 163, the 38th prime
ia[37] = 123456;
```

A while after the assignment happened the change will show up in another agent:

```js
console.log(ia[37]); // Prints 123456;
```

One of the tricky aspects of shared memory is that it's hard to know how long it will take for a write to propagate from one agent to another.  How quickly that happens is actually system-dependent, for a very broad definition of system including the CPU, the operating system, the browser, and in fact whatever else is happening on the system at the time of the write and read.

In fact, without additional *synchronization* the above program is not well-defined.  (It won't crash, but the agent that does the reading may observe other values besides 163 and 123456.)  Synchronization is implemented using atomic operations, described next.

## Atomic operations

## Waiting for things to happen

## Subtleties
