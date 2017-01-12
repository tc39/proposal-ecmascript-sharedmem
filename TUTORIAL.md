# Shared memory - a brief tutorial

## Concurrent agents

In a browser setting it's natural to use WebWorkers for shared agents.  To recap, workers are created by allocating ```Worker``` objects, passing a URL of the script to be run in the worker:
```js
   var w = new Worker("myworker.js")
```
The worker and its creator communicate over a message channel.  In the creator,  a call to ```w.postMessage``` sends a message to the worker, and a handler on the worker object receives messages as events:
```js
w.postMessage("hi");     // send "hi" to the worker
w.onmessage = function (ev) {
  console.log(ev.data);  // prints "ho"
}
```
Meanwhile, in the worker, a global handler receives messages as events, and a call to the global ```postMessage``` function sends a message back to the worker's creator:
```js
onmessage = function (ev) {
  console.log(ev.data);  // prints "hi"
  postMessage("ho");     // sends "ho" back to the creator
}
```
Many types of data - not just strings - can be sent across the channel and will arrive with the correct type and structure at the destination.

## Allocating shared memory, and sharing it

To allocate shared memory, just allocate a SharedArrayBuffer:

```js
var sab = new SharedArrayBuffer(1024);  // 1KiB shared memory
```

The creator can share this memory with the worker by sending it to the worker using the standard ```postMessage``` method:
```js
w.postMessage(sab)
```
In the worker, this object is received as the data property of the event:
```js
var sab;
onmessage = function (ev) {
   sab = ev.data;  // 1KiB shared memory, the same memory as in the parent
}
```

Memory can be created in any agent and then shared with any other agent, and can be shared among many agents simultaneously.

## Creating views on shared memory

A SharedArrayBuffer is like an ArrayBuffer, apart from its memory being shared, and the memory is accessed in the same way as an ArrayBuffer's memory is: by creating views on the buffer, and then accessing the memory via the view using standard array access syntax.  The same view types can be applied to SharedArrayBuffer as to ArrayBuffer, from Int8Array to Float64Array.

Suppose the creator of the shared memory wants to share a large array of prime numbers with its workers, without any intent of modifying that array.  It allocates the memory, fills it, and sends it:

```js
var sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 100000); // 100000 primes
var ia = new Int32Array(sab);  // ia.length == 100000
var primes = new PrimeGenerator();
for ( let i=0 ; i < ia.length ; i++ )
   ia[i] = primes.next();
w.postMessage(ia);
```

The worker receives an Int32Array because that's what was sent:

```js
var ia;
onmessage = function (ev) {
  ia = ev.data;        // ia.length == 100000
  console.log(ia[37]); // prints 163, the 38th prime
}
```

## Updating shared memory, and visibility

Since the memory is truly shared, a write in one agent will be observed in all the other agents that share that memory:

```js
console.log(ia[37]);  // Prints 163
ia[37] = 123456;
```

A while after the assignment happened in the writer the change will show up in another agent:

```js
console.log(ia[37]); // Prints 123456, maybe, eventually
```

One of the trickiest aspects of shared memory is that it's hard to know how long it will take for a write to propagate from one agent to another.  How quickly that happens is actually system-dependent, for a very broad definition of system including the CPU, the operating system, the browser, and in fact whatever else is happening on the system at the time of the write and read.

In fact, without additional *synchronization* the above program is not well-defined.  (It won't crash, but the agent that does the reading may observe other values besides 163 and 123456 - this is counter-intuitive, but it can happen.)  Synchronization is implemented using atomic operations, described next.

## Atomic operations

A new global object called ```Atomics``` provides a number of new *atomic operations* as static methods.  Atomic operations serve several related purposes.

### Predictable values are written and read

An atomic read from an array element that was written with an atomic write will only observe the value that was in the cell before the write, or the value that was written.

In the example above, if the writer uses an atomic write:

```js
console.log(ia[37]);  // Prints 163, the 38th prime
Atomics.store(ia, 37, 123456);
```

then the reader can use an atomic read in a loop to wait for the value to change, and once it does change it will change predictably:

```js
while (Atomics.load(ia, 37) == 163)
  ;
console.log(ia[37]);  // Prints 123456
```

### Atomic operations enforce ordering

When an atomic read observes a value there is a guarantee that all the other writes (atomic or not) that the writer performed before it performed the write that was observed, will also be observable.

That that might not be true is counter-intuitive, but it can happen.  Suppose the writer does this:
```js
ia[42] = 314159;  // was 191
ia[37] = 123456;  // was 163
```
Suppose another worker reads those two values:
```js
console.log(ia[37]);
console.log(ia[42]);
```
The reader may print 123456 and 191, even though it would seem that that should not happen.  The reason is that the writes may be reordered by the compiler and (more often) the CPU.

Atomic operations create points of ordering in the program.  If ia[37] is written atomically, all writes performed before the atomic write will be observable no later than the write to ia[37] is observed:
```js
ia[42] = 314159;  // was 191
Atomics.store(ia, 37, 123456);  // was 163
```

```js
while (Atomics.load(ia, 37) == 163)
  ;
console.log(ia[37]);  // Will print 123456
console.log(ia[42]);  // Will print 314159
```

(Similarly, it is possible for reads to be performed out of order.  Atomic operations also order the reads.)

### Atomic operations are not interruptible

Atomic read-modify-write operations guarantee that no other write gets to happen until the modified value is written back.

Suppose there is a counter in shared memory, at ia[112], that both agents need to increment.  If they increment it with the obvious ```ia[112]++``` then there is a risk that they will both do so at the same time, and an update can be lost (and the result value can be garbage).  The reason is that in order to perform the increment the CPU must load the value, add one to it, and store it back.  In the mean time, some other CPU may have done the same thing.

Instead, using ```Atomics.add(ia, 112, 1)``` will guarantee that that race does not happen: each CPU gets to load, add, and store in isolation without being interrupted, and the counter will be updated correctly.

### Run-down of atomic operations

The following operations are available when ```array``` is an Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array or Uint32Array:

Operation                                     | Function
----------------------------------------------|----------
load(array, index)                            | return the value of array[index]
store(array, index, value)                    | store value in array[index], return value
compareExchange(array, index, oldval, newval) | if array[index] == oldval then store newval in array[index], return the old value of array[index]
exchange(array, index, value)                 | store value in array[index], return the old value of array[index]
add(array, index, value)                      | add value to array[index], return the old value of array[index]
sub(array, index, value)                      | subtract value from array[index], return the old value of array[index]
and(array, index, value)                      | bitwise-and value into array[index], return the old value of array[index]
or(array, index, value)                       | bitwise-or value into array[index], return the old value of array[index]
xor(array, index, value)                      | bitwise-xor value into array[index], return the old value of array[index]

## Waiting for things to happen

In the examples above one agent used a loop to wait for a value to be changed by the other agent; the change is a signal that the agent can stop waiting and can go ahead with whatever it needs to do next.

Such *spin loops* are a poor use of computer time unless the wait is very brief; instead, a waiting agent can put itself to sleep, and can instead be woken up explicitly by the other agent.  The Atomics object provides a primitive mechanism for this in the two methods `wait` and `wake`.

In our example, the writing agent now does this:

```js
console.log(ia[37]);  // Prints 163
Atomics.store(ia, 37, 123456);
Atomics.wake(ia, 37, 1);
```

and the reading agent does this:

```js
Atomics.wait(ia, 37, 163);
console.log(ia[37]);  // Prints 123456
```

The way this works is that once it has performed a write, the writer requests to wake up one agent that's sleeping on location ia[37].  Meanwhile, the reader requests to go to sleep, provided the value of ia[37] is still 163.  Thus if the writer has already performed its write the reader will just continue on, and otherwise it will sleep, waiting to be woken by the writer.

## Abstractions

In practice some of the shared memory facilities, especially `wait` and `wake`, can be hard to use correctly and efficiently.  It is therefore useful to build abstractions (in JavaScript) around these to simplify their use.  For example, among the demos you will find traditional mutexes and condition variables; barriers; and so-called "synchronic" objects that are containers for simple atomic values and which have a built-in (and efficient) wait-for-update functionality.

## Subtleties and practical advice

(Additional topics: race conditions; deadlocks; flatjs?; Web APIs and shared memory.)

### Blocking on the browser's main thread

There is nothing inherently problematic about waiting in the browser's main thread - a `wait` has the same meaning as a loop that waits for a wakeup flag to be set.  However, unless there's a guarantee that the wait will be brief it's often better to avoid such a wait, and instead have a "master worker" that acts on the main thread's behalf and communicates with the main thread using message passing.  The "master worker" can wait indefinitely without impacting the responsiveness of the browser.

A variation on that pattern is a control structure that doesn't need a master worker but where the workers coordinate among themselves about sending a message to the master when some condition is met.  The "asymmetric barrier" in the demo section is such a control structure.

The specification allows the browser to deny `wait` on the main thread, and it is expected that most browsers will eventually do so.  A denied `wait` throws an exception.

### Don't mix atomic and non-atomic accesses

It is certainly possible to access the same array element safely using both atomic and non-atomic accesses, but usually only in limited situations.  In practice, it is best if any given shared array element is accessed either atomically or non-atomically; atomic elements should be used as synchronization variables and simple communication channels, while non-atomic elements can be used for larger amounts of data.

### The cost of shared memory

How expensive is a SharedArrayBuffer?  In the current Firefox implementation it is fairly expensive (the objects are multiples of 4KiB in size and at least 8KiB, and we sometimes reserve more address space), because we have been assuming that the easiest way to use shared memory is to allocate a few fairly large shared objects that are then partitioned by the application using multiple views.  (In a sense this is a self-fulfilling prophecy because it is awkward to transfer shared objects among agents.)  Other implementations could choose different strategies, encouraging the use of small objects (one per shared application object, say).

## Notes on current implementations (January 2016)

Firefox and Chrome both implement the proposed API.

* In Firefox the API is enabled by default in Nightly, and starting with Firefox 46 it can be enabled in Aurora, Developer Edition, Beta, and Release by setting `javascript.options.shared_memory` to true in `about:config`.  Firefox denies `wait` on the main thread.
* In Chrome the API is off by default and can be enabled by command line options (to be documented).

In Firefox there is a per-domain limit on the number of workers that defaults to 20.  Once the limit is exceeded new workers in the domain will be create but will remain un-started.  A program that `wait`s on an un-started worker will usually deadlock.  (Arguably the limitation is a violation of the WebWorkers spec, see [this WHATWG bug that aims to clarify that](https://www.w3.org/Bugs/Public/show_bug.cgi?id=29039).)

