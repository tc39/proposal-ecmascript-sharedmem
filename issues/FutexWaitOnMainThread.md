# Shared memory: Blocking on the main thread

lhansen@mozilla.com / updated 2016-01-12

## Introduction

At the moment, the spec allows `futexWait` to throw an exception if
called on the browser's main thread (and Firefox implements that).
The natural response of the application developer will be to use a
spinloop to implement blocking, and we're no better off.  In this case
we can either (a) further curtail features, inevitably culminating
with the banishing of shared memory views from the main thread or (b)
provide code, minimally libraries but if necessary additional
primitive APIs, to make it easy for programs to avoid blocking on the
main thread.  I favor the latter, it imposes fewer restrictions and is
good enough.

The general pattern will be that while workers can block with
`futexWait` and will be woken when another agent calls `futexWake`, the
master (the main thread) must register a callback and wait for it to
be triggered by a worker.  To simplify code, the callback can be
packaged with async/await when the pattern is "wait for a specific
resouce"; when the pattern is "wait for one of several conditions that
may or may not occur" a straight callback may be simpler.

Should we be thinking of this in terms of the signaling, ie, waking
from a `futexWait` in the worker and receiving the callback in the
master, or should we be thinking of this in terms of specific use
cases, eg, critical sections, atomic cells, monitor objects,
producer-consumer queues, and so on?  There needn't be a conflict, but
a general signaling mechanism may in practice be less useful than
multiple use-case-specific mechanisms.

So the goal of this exercise is in my view two things:

* to enumerate some suitable master/worker patterns (use cases), and
* to determine if those patterns can be implemented efficiently
  without additional features or, if not, figure out the new
  primitives that are required.

## Findings - Functionality

After some experimentation it is clear that it is possible and
reasonably practical to build some "asymmetric" data structures in JS
using only a `futexWait` that can block on a worker thread, not on the
main thread, and using Message events to signal the main thread.

These data structures are described later, but in summary: Primitive
data structures that can be built fairly easily are synchronics
(shared atomic cells where updates trigger inter-thread signals) and
barrier synchs.  Using synchronics we can further build bounded
unidirectional queues and simple latches, while barrier synchs or
queues can be used to build data-parallel computation frameworks.
These data structures have high-bandwidth worker-to-worker and
master-to-worker communication; worker-to-master communication is
slower due to message passing but that is usually OK.

That is, for basic functionality it is almost certainly not necessary
to add another primitive, such as the proposed `futexWaitCallback`,
which would trigger a callback in the master in response to a
`futexWake` in a worker.

(Using the Message event is not great for software modularity, but
appears workable for the time being.)

## Findings - Performance

Experience shows that communiction bandwidth can be increased
significantly if the agent that is waiting for a signal does not
immediately block (or, for the master, immediately return to its event
loop) but instead busy-waits or micro-waits "briefly" to reduce the
wait/wake latency that comes from blocking.

Such busy-waiting -- how to do it, for how long to do it -- is usually
system-specific.  For C++, there is a pending proposal to add
"synchronic" objects that are atomic shared cells that can be used for
efficient signalling between threads.  Synchronics are higher level
than Futexes but lower level than locks, and they would incorporate
system-dependent knowledge of busy-waiting and other optimizations.

One can implement synchronics in JS using Futexes, but incorporating
the desirable optimizations is hacky at best.  There are a couple of
approaches to fixing that.

### Micro-wait plus futexWaitCallback

One approach to better performance is to allow `futexWait` to wait for
a short system-dependent time even on the main thread, consider eg

```js
Atomics.futexWait(..., Atomics.MICRO_WAIT)
```

which might wait for a very short time in a way that is not
detrimental to system performance before timing out or waking up from
receiving a wakeup signal.

As the micro-wait would be allowed on the main thread, a worker could
use `futexWake` to signal the main thread.  To avoid that the signal
is lost if the signal is in transit when the main thread times out,
however, we would need something like `futexWaitCallback` on the main
thread.

### Primitive "synchronic" functionality

Another approach to better performance is to add an API that takes us
toward native synchronics.  (I don't yet know if Futexes would still
be necessary for certain low-level applications or not.)

When waiting on a Synchronic the waiter specifies the value that it
expects the cell to take on or not take on before it wants to be
woken.  This makes Synchronics easier to use than Futexes for many
applications, and makes them amenable to built-in optimization:
wakeups need in principle only happen when they are called for, while
with "bare" futexes wakeups will have to happen for every waiter to
re-check its condition.

Synchronics have a more complicated API than Futexes: a Futex needs
only one int32 cell; a synchronic needs information about the
condition, the condition value, and in practice space for coordination
data, which may be of system-dependent size.  That space probably
can't be system-allocated, it has to be provided in shared memory by
the client application, and the application must manage that memory.

For Synchronics, as for `futexWaitCallback`, a wakeup on the main
thread must take the form of an event or callback.

## Data structures


### Asymmetric Synchronics

[Implementation](https://github.com/lars-t-hansen/parlib-simple/blob/master/src/asymmetric-synchronic.js);
[Test/sample html](https://github.com/lars-t-hansen/parlib-simple/blob/master/test/test-asymmetric-synchronic.html);
[Test/sample master code](https://github.com/lars-t-hansen/parlib-simple/blob/master/test/test-asymmetric-synchronic-master.js);
[Test/sample worker code](https://github.com/lars-t-hansen/parlib-simple/blob/master/test/test-asymmetric-worker.js).

The synchronic models a simple atomic shared cell with the usual suite
of accessors: load, store, compareExchange, add, and so on.  (The
sample implementation supports only int32 but this is easily fixed.)
In addition, there are methods for listening for updates:
`waitForUpdate`, `waitUntilEquals`, `waitUntilNotEquals`.  In a worker, the
listening methods can block.  In a master, a wait must return to the
event loop and receive a callback later, and the methods are called
`callbackWhenUpdated`, `callbackWhenNotEqual`, `callbackWhenEqual` instead,
and there's a simple protocol for handling callbacks that are called
immediately and for handling timeouts.

With a synchronic, a (blocking) lock is quite simple:

```js
while (s.compareExchange(0, 1) == 1)
    s.waitUntilEquals(0);
...
s.store(0);
```

Importantly, if two threads are communicating at a high rate a waiting
primitive can incorporate certain busy-wait optimizations to avoid
blocking the thread immediately, and this can increase communication
bandwidth significantly.

While in principle the signal condition can be checked by always
waking the waiter and having it re-check the condition, it is also
possible to check the condition in the signaling thread, avoiding
unnecessary thread wakeups.  That might be especially appealing if the
signal is being sent to the main thread, where a wakeup is an event
dispatch.  A native implementation would have an advantage here as the
mechanism could be implemented on the main thread but outside the
event handling machinery.

A subtle point about asymmetric synchronics is that the master is
really cooperatively multithreaded, or, if you like, it can have any
number of callbacks waiting for an update to a cell.  The sample
implementation handles this properly but this is another case that can
benefit from a low-level optimization where the updating worker only
sends a signal if there's a call for it.

Finally, though these synchronics handle a nonblocking master, they
are efficient if used for just worker-to-worker communication.


### Asymmetric Barriers

[Implementation](https://github.com/lars-t-hansen/parlib-simple/blob/master/src/asymmetric-barrier.js);
[Test/sample html](https://github.com/lars-t-hansen/parlib-simple/blob/master/test/test-asymmetric-barrier.html);
[Test/sample master code](https://github.com/lars-t-hansen/parlib-simple/blob/master/test/test-asymmetric-barrier-master.js);
[Test/sample worker code](https://github.com/lars-t-hansen/parlib-simple/blob/master/test/test-asymmetric-barrier-worker.js).

These barriers allow the master to know when all the workers are
stopped: when all workers are in the barrier the master is signaled,
and the master can then start all the workers when it is done with its
critical section.

The barrier could have been based on synchronics but predate the
synchronic implementation and use simple futex-based cooperation among
the workers along with a postMessage to signal the master.  For as
simple as the barrier implementation is, the implementation had a race
condition that required the addition of a seqLock to fix; this only
illustrates how hard futexes are to use properly.  A synchronics-based
implementation would have been simpler.


### Unidirectional integer-bundle queues

[Implementation](https://github.com/lars-t-hansen/parlib-simple/blob/master/src/asymmetric-intqueue.js);
[Test/sample html](https://github.com/lars-t-hansen/parlib-simple/blob/master/test/test-asymmetric-intqueue-m2w.html);
[Test/sample master code](https://github.com/lars-t-hansen/parlib-simple/blob/master/test/test-asymmetric-intqueue-m2w-master.js);
[Test/sample worker code](https://github.com/lars-t-hansen/parlib-simple/blob/master/test/test-asymmetric-intqueue-m2w-worker.js).

These integer queues transmit bundles of int32 data and are useful for
marshaled data, for example.  They are built on synchronics (both for
signaling availability and space, and for controlling a critical
section among concurrent workers) and adopt the synchronics' API:
workers can perform blocking put and take, while the main thread has
nonblocking `callbackWhenCanPut` and `callbackWhenCanTake` methods
along with `putOrFail` and `takeOrFail`.

Being built on synchronics, the queues also handle any number of
"threads" in the master.


### Parallel computation frameworks

[Implementation](https://github.com/lars-t-hansen/parlib-simple/blob/master/src/par.js);
[Sample html](https://github.com/lars-t-hansen/parlib-simple/blob/master/demo/mandelbrot-animation2/mandelbrot.html);
[Sample master js](https://github.com/lars-t-hansen/parlib-simple/blob/master/demo/mandelbrot-animation2/mandelbrot-master.js);
[Sample worker js](https://github.com/lars-t-hansen/parlib-simple/blob/master/demo/mandelbrot-animation2/mandelbrot-worker.js).

This is a simple data-parallel framework with work distribution and
result collection.  At the moment it is built on the asymmetric
barrier as well as a custom shared-memory queue (it could easily use
the integer-bundle queues above, but the code predates those queues).
