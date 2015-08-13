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

## Atomic operations

## Waiting for things to happen

