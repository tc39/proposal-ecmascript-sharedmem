# Introduction

SharedArrayBuffer provides two strengths of memory operations: atomic and non-atomic. Correctly synchronized atomic operations are sequentially consistent, i.e., there is a global total ordering of memory operations that all agents observe. Non-atomic operations are globally unordered, i.e. they are only ordered by sequential agent order. Incorrectly synchronized atomic operations, such as two racing writes to overlapping but not equal location ranges, behave as if they were non-atomic. Currently, no weak atomic ordering semantics, such as release-acquire, is supported.

We hope this enables non-atomic operations to be compiled to bare stores and loads on target architectures, and atomics to be compiled to ensure sequential consistency in the usual way, such as sequential consistency-guaranteeing instructions or double fencing.

The memory consistency model (hereinafter "memory model") aims to define the ordering of shared memory operations. The model is axiomatic, takes significant inspiration from LLVM, and should also be familiar to readers who have read C++'s memory model. An axiomatic model also allows for flexibility in supporting multiple, possibly noncomparable weak consistency models in hardware such as those of ARM and Power.

# Model

The memory model describes the allowed orderings of SharedArrayBuffer events and host-provided events (e.g., those arising from `postMessage`). We represent events as ReadSharedMemory(_order_, _block_, _byteIndex_, _elementSize_) and WriteSharedMemory(_order_, _block_, _byteIndex_, _elementSize_, _bytes_) metafunctions that occur during evaluation.  [[[ Describe the allowable values for _order_ here ]]]

Let the range of an event be the byte locations from _byteIndex_ to _byteIndex_ + _elementSize_, inclusive. [[[ Inclusive can't be right here since it means that two accesses that are nonoverlapping in the execution are overlapping in the model. ]]] We say these ranges are overlapping, equal, subsumed, or disjoint, which mean the usual things. Ranges are not considered overlapping, equal, or subsumed when two events do not have the same _block_.

These events are ordered by two relations: happens-before and reads-from, defined mutually recursively as follows.

### agent-order

The total order of SharedArrayBuffer events in a single agent during a particular evaluation of the program.

### synchronizes-with

A partial order between pairs of events such that:

1. For each ReadSharedMemory event _R_ with _order_ `"SeqCst"` that reads-from a WriteSharedMemory event _W_:
  1. If _W_ has _order_ `"SeqCst"` and _R_ and _W_ have the same range then:
    1. Assert that _R_ reads-from the singleton set containing _W_.
    1. There is an edge in synchronizes-with from _R_ to _W_.
1. There is an edge between host-provided synchronization events.  [[[ This is weak, flesh out a bit ]]]
1. NOTE: The above clause applies to calls such `postMessage` between agents.  [[[ Would move this note out of the algorithm ]]]

NOTE: Only correctly synchronized pairs of atomic reads and writes synchronizes-with each other. Racing atomic operations on overlapping ranges do not synchronizes-with each other.  [[[ This is very confusing at this point since it uses terms that are not yet defined (race) or arguably not defined at all (correctly synchronized). ]]]

### happens-before

The least partial order that is a superset of agent-order and includes all edges in synchronizes-with.  [[[ So above, agent-order is per agent, but here it can't be that, so what kind of combination is it? ]]]

### reads-from

A function from ReadSharedMemory events to sets of WriteSharedMemory events such that for each read event _R_ that reads-from some set of write events _Ws_:

1. For each byte location _l_ in _R_'s range:
  1. There is a _W<sub>1</sub>_ in _Ws_ that has _l_ in its range, and
  1. If _R_ has _order_ `"SeqCst"`, there is no _W<sub>2</sub>_ in _Ws_ that has _l_ in its range such that:
    1. _W<sub>1</sub>_ and _W<sub>2</sub>_ both have _order_ `"SeqCst"` and have the same range.
    1. NOTE: This prohibits a `"SeqCst"` read event from reading a value composed of bytes from different `"SeqCst"` write events on the same range.
  1. It is not the case that _R_ happens-before _W<sub>1</sub>_, and
  1. There is no _W<sub>2</sub>_ in _Ws_ [[[ that has _l_ in its range ]]] such that _W<sub>1</sub>_ happens-before _W<sub>2</sub>_ and _W<sub>2</sub>_ happens-before _R_.

[[[ I think the assertion in the last step is incorrect.  Consider two writes performed by an agent; W1 writes to [0..3] and W2 writes to [2..3] and W1 h-b W2.  Now another agent reads [0..3].  Consider position 2.  Both W1 and W2 must be in _Ws_ for _R_ to pick up all the bytes.  But if W1 is chosen in 1.i then 1.iv is violated.  ]]]

### Initial Values

For each byte location _l_ in _block_, there is a WriteSharedMemory(`"Init"`, _block_, _l_, 1, _v0<sub>l</sub>_) for a host-defined value _v0<sub>l</sub>_ such that it is happens-before all other WriteSharedMemory events with overlapping ranges.

[[[ This is a start but it's going to be tricky to make this work for us in the context of translating from C++ code, since memory will be recycled without the SAB being freed and reallocated, and we need a way to apply this mechanism to recycled memory.  I wouldn't get hung up on this quite yet but it will be a headache.  There are few solutions here. ]]]

### Races

Two shared memory events _E<sub>1</sub>_ and _E<sub>2</sub>_ are said to be in a race if all of the following conditions hold.

1. It is not the case that _E<sub>1</sub>_ happens-before _E<sub>2</sub>_ or _E<sub>2</sub>_ happens-before _E<sub>1</sub>_.
1. Either _E<sub>1</sub>_ or _E<sub>2</sub>_ is a WriteSharedMemory event.  [[[ Or both? ]]]
1. _E<sub>1</sub>_ and _E<sub>2</sub>_ have overlapping ranges or the same range.  [[[ What about subsumed? ]]]

Two shared memory events _E<sub>1</sub>_ and _E<sub>2</sub>_ are said to be in a data race if they are in a race and additionally, any of the following conditions hold.

1. Either _E<sub>1</sub>_ or _E<sub>2</sub>_ does not have _order_ `"SeqCst"`, or
1. _E<sub>1</sub>_ and _E<sub>2</sub>_ have overlapping ranges but not the same range.  [[[ What about subsumed? ]]]

### Candidate Executions

We call a happens-before relation together with a reads-from relation a candidate execution of an agent cluster. For each program there may be many candidate executions, some of which the memory model disallows. We disallow candidate executions which exhibit out of thin air reads and lack sequential consistency for events with non-overlapping and non-subsuming ranges with _order_ `"SeqCst"`.

### No Out of Thin Air Reads

Let depends-on be a relation on shared memory events that is consistent with agent-order and captures data and control dependencies between events. A candidate execution has no out of thin air reads if there is no cycle in the union of reads-from and depends-on.

NOTE: Out of thin air reads is an artifact of axiomatic memory models. For other languages with axiomatic memory models, thin air reads have not been observed on any known hardware nor due to any known compiler transform.

Draft Note: This is intentionally underspecified. Precisely capturing and forbidding OOTA is currently an open problem.

### Sequentially Consistent Atomics

A candidate execution has sequentially consistent atomics if there is a partial order memory-order on events with _order_ `"SeqCst"` such that:

1. If a shared memory event _E<sub>1</sub>_ happens-before a shared memory event _E<sub>2</sub>_, _E<sub>1</sub>_ is memory-order before _E<sub>2</sub>_.
1. If a ReadSharedMemory event _R_ with _order_ `"SeqCst"` reads-from a WriteSharedMemory event _W<sub>1</sub>_ with _order_ `"SeqCst"` and _R_ and _W<sub>1</sub>_ have the same range, there is no WriteSharedMemoryEvent _W<sub>2</sub>_ with the same range such that _R_ is memory-order before _W<sub>2</sub>_ and _W<sub>2</sub>_ is memory-order before _W<sub>1</sub>_.
1. If a ReadSharedMemory event _R_ and a WriteSharedMemory event _W_ are introduced by a single `Atomics.compareExchange` call then:
  1. Assert the _order_ of both _R_ and _W_ is `"SeqCst"`.
  1. _R_ is memory-order before _W_, and
  1. There is no other shared memory event _E_ such that _R_ is memory-order before _E_ and _E_ is memory-order before _W_.

NOTE: Unlike C++, there is no total memory ordering for all `"SeqCst"` events. Executions require that memory-order be total for all `"SeqCst"` events that is reads-from with other `"SeqCst"` events of the same range. Executions do not require that overlapping `"SeqCst"` events that race be totally ordered.

### Valid Executions

A candidate execution is valid (hereinafter an "execution") if it has no out of thin air reads and has sequentially consistent atomics.

### Semantics of ReadSharedMemory and WriteSharedMemory

Given an execution, the semantics of ReadSharedMemory and WriteSharedMemory is as follows.

ReadSharedMemory(_order<sub>1</sub>_, _block<sub>1</sub>_, _byteIndex<sub>1</sub>_, _elementSize<sub>1</sub>_)

  1. Let _Ws_ be the set of write events that this ReadSharedMemory event reads-from.
  1. Let _v_ be 0.
  1. For _l_ from 0 to _elementSize_:
    1. Choose a WriteSharedMemory(_order<sub>2</sub>_, _block<sub>2</sub>_, _byteIndex<sub>2</sub>_, _elementSize<sub>2</sub>_, _bytes_) _W_ from _Ws_ that has the byte location _byteIndex_ + _l_ in its range.
    1. Assert that such a _W_ exists.
    1. Let the <em>l</em>th byte in _v_ be _W_'s value for the <em>l</em>th byte in its _bytes_.
  1. Return _v_.

NOTE 1: These are not runtime semantics. Weak consistency models permit causality paradoxes and non-multiple copy atomic observable behavior that are not representable in the non-speculative step-by-step semantics labeled "Runtime Semantics" in ECMA262. Thought of another way, sequential evaluation of a single agent gives an initial partial ordering to ReadSharedMemory and WriteSharedMemory events. These events, and events from every other agent in the agent cluster, must be partially ordered with each other according to the rules above, and then the order must be validated. ReadSharedMemory and WriteMemoryEvents are only well-defined when given an execution.

NOTE 2: In an execution, a `"SeqCst"` ReadSharedMemory event _R_ that synchronizes-with a `"SeqCst"` WriteSharedMemory event _W_ means that _R_ reads-from the singleton set containing _W_. This ensures access atomicity for synchronized pairs of atomics in the "choice semantics" above.

### Sequential Consistency for Data Race Free Programs

We say an execution is data race free if it has no data races between any two memory operation events. A program is data race free if all its executions are data race free.

The memory model implies that all executions of all data race free programs are sequentially consistent.

# Compiler Guidelines

Given a host-defined notion of observable of programs, the following restrictions to compiler transforms for non-atomics.

  - An API call resulting in a single ReadSharedMemory event that affects observable behavior cannot be transformed into API calls resulting in multiple ReadSharedMemory events.
  - An API call resulting in a single WriteSharedMemory event that affects observable behavior cannot be transformed into API calls resulting in multiple WriteSharedMemory events.
  - API calls resulting in WriteSharedMemory events that affect observable behavior may not have their ranges narrowed.
  - API calls resulting in WriteSharedMemory events that affect observable behavior may not be removed.
  - API calls resulting in WriteSharedMemory events that both affect observable behavior and would not have otherwise arisen may not be introduced.

NOTE: Shared memory operations may be introduced, elided, or merged if they do not affect observable of the program. For example, nonbinding prefetches of cache lines, assuming correctness of invalidations, are allowed. Contrastingly, rematerializing an observable read is not. For example, the follow two programs are not equivalent.

```
let x = M[a];
if (x) observe(x);
```

```
if (M[a]) observe(M[a]);
```

The following additional restrictions apply for atomics.

  - API calls resulting in `"SeqCst"` events that affect observable behavior may not be reordered.

The additional restriction apply to transforms for data race free programs.

  - API calls resulting in shared memory events that do not affect observable behavior may not be transformed to API calls that result in shared memory events that affect observable behavior.

Draft Note: This provisio is intended to prohibit transforms that leak information.

# Code Generation Guidelines

For architectures no weaker than ARM or Power, non-atomic stores and loads may be compiled to bare stores and loads on the target architecture. Atomic stores and loads may be compiled down to instructions that guarantee sequential consistency. If no such instructions exist, memory barriers are to be employed, such as placing barriers on both sides of a bare store or load.

# TODO

- Litmus tests examples
