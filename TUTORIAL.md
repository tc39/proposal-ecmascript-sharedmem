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
w.postMessage(ia, [ia.buffer]);
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
console.log(ia[37]); // Prints 123456, maybe
```

One of the tricky aspects of shared memory is that it's hard to know how long it will take for a write to propagate from one agent to another.  How quickly that happens is actually system-dependent, for a very broad definition of system including the CPU, the operating system, the browser, and in fact whatever else is happening on the system at the time of the write and read.

In fact, without additional *synchronization* the above program is not well-defined.  (It won't crash, but the agent that does the reading may observe other values besides 163 and 123456 - this is counter-intuitive, but it can happen even on some modern platforms.)  Synchronization is implemented using atomic operations, described next.

## Atomic operations

A new object called Atomics provides a number of new *atomic operations* as static methods.  Atomic operations serve several related purposes.

First, an atomic read from an array element that was written with an atomic write will only observe the value that was in the cell before the write, or the value that was written. 

In the example above, if the writer uses an atomic write:
```js
console.log(ia[37]);  // Prints 163, the 38th prime
Atomics.store(ia, 37, 123456);
```
then the reader can use an atomic read in a loop to wait for the value to change:
```js
while (Atomics.load(ia, 32) == 163)
  ;
console.log(ia[37]);  // Prints 123456
```

Second, when an atomic read observes a value there is a guarantee that all the other writes (atomic or not) that the writer performed before it performed the write that was observed, will also be observable.  (That that might not be true is counter-intuitive, but it can happen.)  If the writer, in the example above, had written the value 314159 (non-atomically) to ia[42] before its atomic store, then the reader would be able to read ia[42] (also non-atomically) after the loop, and would read the value 314159.

Third, atomic read-modify-write operations guarantee that no other write gets to happen until the modified value is written back.  Suppose there is a counter in shared memory, at ia[112], that both agents need to increment.  If they increment it with the obvious ```ia[112]++``` then there is a risk that they will both do so at the same time, and an update can be lost (and the result value can be garbage).  Instead, using ```Atomics.add(ia, 112, 1)``` will guarantee that that does not happen.

## Waiting for things to happen

In the example above one agent used a loop to wait for a value to be changed by the other agent; the change is a signal that the agent can stop waiting and can go ahead with whatever it needs to do next.

Such *spin loops* are a poor use of computer time unless the wait is very brief; instead, a waiting agent can put itself to sleep, and can instead be explicitly woken up by the other agent.  The Atomics object provides a primitive mechanism for this in the two methods ```futexWait``` and ```futexWake```.  (The term "futex" comes from Linux, where there's a similar sleep-and-wakeup facility.)

In our example, the writing agent now does this:
```js
console.log(ia[37]);  // Prints 163, the 38th prime
Atomics.store(ia, 37, 123456);
Atomics.futexWake(ia, 37, 1);
```

and the reading agent does this:

```js
Atomics.futexWait(ia, 37, 163);
console.log(ia[37]);  // Prints 123456
```

The way this works is that once it's performed a write, the writer requests to wake up at most one agent that's sleeping on location ia[37].  Meanwhile, the reader requests to go to sleep, provided the value of ia[37] is still 163.  Thus if the writer has already performed its write the reader will just continue on, and otherwise it will sleep, waiting to be woken by the writer.

## Abstractions

In practice some of the shared memory facilities, especially futexWait and futexWake, can be hard to use correctly and efficiently.  It is therefore useful to build abstractions (in JavaScript) around these to simplify their use.  For example, among the demos you will find traditional mutexes and condition variables; barriers; and so-called "synchronic" objects that are containers for simple atomic values and have built-in (and efficient) wait-for-update functionality.

## Subtleties and advice

(To be written.  Topics: race conditions; ordering of reads and writes; don't mix atomics and non-atomics; the main thread; deadlocks)

## Notes on the current Firefox Nightly implementation (August 2015)

Firefox Nightly implements a slightly different API at the moment, based on an older design: there is a separate set of "SharedTypedArray" types that must be used instead of the normal TypedArray types.  That is, to create a view on a SharedArrayBuffer, use the "SharedInt32Array" type instead of the Int32Array type.

Firefox also has a couple of idiosyncracies around workers.  The agent that creates a worker must return to its event loop before the worker will be properly created (the worker will remain un-started until then).  Also, there's a per-domain limit on the number of workers, it defaults to 20; once the limit is exceeded new workers will remain un-started.  A program that futexWaits on an un-started worker will usually deadlock.
