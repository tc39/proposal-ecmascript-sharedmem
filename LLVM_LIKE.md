# Introduction

SharedArrayBuffer provides two strengths of memory operations: atomic and non-atomic. Correctly synchronized atomic operations are sequentially consistent, i.e., there is a global total ordering of atomic memory operations that all agents observe. Non-atomic operations are globally unordered, i.e. they are only ordered by sequential agent order. Incorrectly synchronized atomic operations, such as two racing writes to overlapping but not equal location ranges, behave as if they were non-atomic. Currently, no weak atomic ordering semantics, such as release-acquire, is supported.

We hope this enables non-atomic operations to be compiled to bare stores and loads on target architectures, and atomics to be compiled to ensure sequential consistency in the usual way, such as sequential consistency-guaranteeing instructions or double fencing.

The memory consistency model (hereinafter "memory model") aims to define the ordering of shared memory operations. The model is axiomatic, takes significant inspiration from LLVM, and should also be familiar to readers who have read C++'s memory model. An axiomatic model also allows for flexibility in supporting multiple, possibly noncomparable weak consistency models in hardware such as those of ARM and Power.

# Model

The memory model describes the allowed orderings of SharedArrayBuffer events (hereinafter "events") and host-provided events (e.g., those arising from `postMessage`). We represent SharedArrayBuffer events as ReadSharedMemory(_order_, _block_, _byteIndex_, _elementSize_) and WriteSharedMemory(_order_, _block_, _byteIndex_, _elementSize_, _bytes_) metafunctions that occur during evaluation. Allowed values for _order_ are `"SeqCst"`, `"Init"`, or `"None"`.

Let the range of an event be the byte locations in the interval [_byteIndex_, _byteIndex_ + _elementSize_). We say these ranges are overlapping, equal, subsumed, or disjoint, which mean the usual things. Two events' ranges are disjoint when they do not have the same _block_.

These events are ordered by two relations: happens-before and reads-from, defined mutually recursively as follows.

### agent-order

The total order of SharedArrayBuffer events in a single agent during a particular evaluation of the program.

### synchronizes-with

The least relation between pairs of events such that:

1. For each pair of ReadSharedMemory event _R_ and WriteSharedMemory event _W_ such that _R_ has _order_ `"SeqCst"` and that _R_ reads-from _W_:
  1. If _W_ has _order_ `"SeqCst"` and _R_ and _W_ have the same range then:
    1. Assert: There is no other WriteSharedMemory event _V_ such that _R_ reads-from _V_.
    1. _R_ synchronizes-with _W_.
  1. Otherwise, if _W_ has _order_ `"Init"` then:
    1. Let _allInitReads_ be true.
    1. For each WriteSharedMemory event _V_ such that _R_ reads-from _V_:
      1. If _V_ does not have _order_ `"Init"` then:
        1. Set _allInitReads_ to false.
    1. If _allInitReads_ is true then:
      1. _R_ synchronizes-with _W_.
1. Let additional-synchronizes-with be a host-provided relation between pairs of events.
1. Let _E<sub>1</sub>_ and _E<sub>2</sub>_ be events.
1. If _E<sub>1</sub>_ additional-synchronizes-with _E<sub>2</sub>_ then:
  1. _E<sub>1</sub>_ synchronizes-with _E<sub>2</sub>_.

NOTE 1: The additional-synchronizes-with relation allows the host to provide additional synchronization mechanisms, such as `postMessage` between HTML workers.

NOTE 2: Not all events with _order_ `"SeqCst"` related by reads-from are related by synchronizes-with. Only those events that also have the same range are related by synchronizes-with.

[[[ The Init machinery is plausible but insufficient for reasons discussed earlier, ie, typically memory will be "re-initialized" with normal writes as part of normal program execution, not with these magic initializing stores.  ]]]

### happens-before

The least partial order such that that:

1. For each pair of events _E<sub>1</sub>_ and _E<sub>2</sub>_:
  1. For each agent _a_ in the agent cluster:
    1. If _E<sub>1</sub>_ is agent-order before _E<sub>2</sub>_ in the agent-order of _a_, then _E<sub>1</sub>_ happens-before _E<sub>2</sub>_.
    1. If _E<sub>1</sub>_ synchronizes-with _E<sub>2</sub>_, then _E<sub>1</sub>_ happens-before _E<sub>2</sub>_.

[[[ Also include transitivity probably. ]]]

### reads-bytes-from

A function from ReadSharedMemory events to a List of WriteSharedMemory events such that:

1. For each ReadSharedMemory event _R_:
  1. There is a List [[[ of length equal to the range of R? ]]] of WriteSharedMemory events _Ws_ such that _R_ reads-bytes-from _Ws_.
  1. For each byte location _l_ in _R_'s range:
    1. Let _W<sub>l</sub>_ be the <em>l</em>th event in _Ws_.
    1. _W<sub>l</sub>_ has _l_ in its range, and
    1. It is not the case that _R_ happens-before _W<sub>l</sub>_, and
    1. There is no WriteSharedMemory event _V_ [[[ that has been observed by the agent that issued R ]]] that has _l_ in its range such that _W<sub>l</sub>_ happens-before _V_ and _V_ happens-before _R_.
  1. If _R_ has _order_ `"SeqCst"` and there is an event _W_ in _Ws_ that has _order_ `"SeqCst"` and the same range as _R_ then:
    1. For each byte location _l_ in _R_'s range:
      1. Let _W<sub>l</sub>_ be the <em>l</em>th event in _Ws_.
      1. _W_ and _W<sub>l</sub>_ are the same event.
    1. NOTE: This prohibits a `"SeqCst"` read event from reading a value composed of bytes from different `"SeqCst"` write events on the same range.

[[[ Clause 1.ii seems fine, it says we observe the last byte that has reached us at each location.   Clause 1.iii.b is not correct however.  Consider an agent that issues a SeqCst write to [0..3] followed by a None write (maybe Unordered would be the better name) to [1], say.  Suppose another agent observes both of those in a read.  The read must have both writes in its Ws since it must observe the latter for the value at [1] but needs the other for the other three bytes.  Now the condition at 1.iii is fulfilled with W being the write to [0..3] but at I==1 Wl will be the write to [1].  ]]]

[[[ As a strictly editorial matter it would be better to use another letter than ell because github renders it as a cursive capital I. ]]]

### reads-from

The least relation between pairs of events such that:

1. For each pair of ReadSharedMemory event _R_ and WriteSharedMemory event _W_:
  1. If _R_ reads-bytes-from a List of WriteSharedMemory events _Ws_ that contains _W_ then:
    1. _R_ reads-from _W_.

### Initial Values

For each byte location _l_ in a _block_, there is a WriteSharedMemory(`"Init"`, _block_, _l_, 1, _v0<sub>l</sub>_) event for a host-provided value _v0<sub>l</sub>_ such that it is happens-before all other WriteSharedMemory events with _l_ in their ranges.

[[[ This is a start but it's going to be tricky to make this work for us in the context of translating from C++ code, since memory will be recycled without the SAB being freed and reallocated, and we need a way to apply this mechanism to recycled memory.  I wouldn't get hung up on this quite yet but it will be a headache.  There are few solutions here. ]]]

### Races

Two shared memory events _E<sub>1</sub>_ and _E<sub>2</sub>_ are said to be in a race if all of the following conditions hold.

1. It is not the case that _E<sub>1</sub>_ happens-before _E<sub>2</sub>_ or _E<sub>2</sub>_ happens-before _E<sub>1</sub>_, and
1. At least one of _E<sub>1</sub>_ or _E<sub>2</sub>_ is a WriteSharedMemory event, and
1. _E<sub>1</sub>_ and _E<sub>2</sub>_ have overlapping ranges, the same range, or one event's range subsumes the other's.

[[[ This would be a good place to use "disjoint", which is otherwise going unused.  ]]]

Two shared memory events _E<sub>1</sub>_ and _E<sub>2</sub>_ are said to be in a data race if they are in a race and additionally, any of the following conditions holds.

1. At least one of _E<sub>1</sub>_ or _E<sub>2</sub>_ does not have _order_ `"SeqCst"`, or
1. _E<sub>1</sub>_ and _E<sub>2</sub>_ do not have the same range.

### Candidate Executions

We call a set of events, a happens-before relation, and a reads-from relation a candidate execution of an agent cluster.

### No Out of Thin Air Reads

Let depends-on be a relation on shared memory events that is consistent with the agent-order of each agent in the agent cluster and captures data and control dependencies between events. A candidate execution has no out of thin air reads if there is no cycle in the union of reads-from and depends-on.

NOTE: Out of thin air reads is an artifact of axiomatic memory models. For other languages with axiomatic memory models, thin air reads have not been observed on any known hardware nor due to any known compiler transform.

Draft Note: This is intentionally underspecified. Precisely capturing and forbidding OOTA is currently an open problem.

### Sequentially Consistent Atomics

Let the set of viable atomic events be the set of events with _order_ `"SeqCst"` or `"Init"` that are not in a data race with any other event.

A candidate execution has sequentially consistent atomics if there is a total order _memory-order_ such that:

1. For each pair of events _E<sub>1</sub>_ and _E<sub>2</sub>_ in the set of viable atomic events:
  1. If _E<sub>1</sub>_ happens-before _E<sub>2</sub>_ then:
    1. _E<sub>1</sub>_ is memory-order before _E<sub>2</sub>_.
  1. If _E<sub>1</sub>_ is a ReadSharedMemory event _R_ and _E<sub>2</sub>_ is a WriteSharedMemory event _W_ such that _R_ reads-from _W_ then:
    1. Assert: _R_ has _order_ `"SeqCst"`.
    1. There is no WriteSharedMemory event _V_ with the same range as _R_ such that _R_ is memory-order before _V_ and _V_ is memory-order before _W_.
  1. If _E<sub>1</sub>_ is a ReadSharedMemory event _R_ and _E<sub>2</sub>_ is a WriteSharedMemory event _W_ such that _R_ and _W_ are introduced by a single read-modify-write API call (e.g., `Atomics.compareExchange`) then:
    1. Assert: _R_ and _W_ have _order_ `"SeqCst"`.
    1. _R_ is memory-order before _W_, and
    1. There is no event _E_ such that _R_ is memory-order before _E_ and _E_ is memory-order before _W_.

NOTE: There is no total memory ordering for all events with _order_ `"SeqCst"`. Executions do not require that racing `"SeqCst"` events with overlapping ranges (i.e., those that participate in a data race) be totally ordered.

### Valid Executions

A candidate execution is valid (hereinafter an "execution") if it has no out of thin air reads and has sequentially consistent atomics.

### Semantics of ReadSharedMemory and WriteSharedMemory

Given an execution, the semantics of ReadSharedMemory and WriteSharedMemory is as follows.

ReadSharedMemory(_order_, _block_, _byteIndex_, _elementSize_)

  1. Let _Ws_ be the list of events such that this ReadSharedMemory event reads-from.
  1. Let _v_ be 0.
  1. For _l_ from 0 to _elementSize_-1:
    1. Let _W<sub>l</sub>_ be the <em>l</em>th event in _Ws_.
    1. Assert that _W<sub>l</sub>_ is a WriteSharedMemory event with the same _block_.
    1. Let the <em>l</em>th byte in _v_ be _W<sub>l</sub>_'s value for the <em>l</em>th byte in its _bytes_.
  1. Return _v_.

NOTE 1: These are not "Runtime Semantics". Weak consistency models permit causality paradoxes and non-multiple copy atomic observable behavior that are not representable in the non-speculative step-by-step semantics labeled "Runtime Semantics" in ECMA262. Thought of another way, sequential evaluation of a single agent gives an initial partial ordering to ReadSharedMemory and WriteSharedMemory events. These events, and events from every other agent in the agent cluster, must be then partially ordered with each other according to invariants above to form candidate executions. Finally, these candidate executions must be validated to see which are allowed. ReadSharedMemory and WriteMemoryEvents are only well-defined when given an execution.

NOTE 2: In an execution, a `"SeqCst"` ReadSharedMemory event _R_ that synchronizes-with a `"SeqCst"` WriteSharedMemory event _W_ means that _R_ reads-from a single _W_. This ensures access atomicity for synchronized atomic reads.

NOTE 3: In an execution, a ReadSharedMemory event that participates in a data race may reads-from multiple, different WriteSharedMemory events. The value read is composed of bytes from these WriteSharedMemory events, which does not guarantee access atomicity for the read.

### Sequential Consistency for Data Race Free Programs

We say an execution is data race free if it has no data races between any two memory operation events. A program is data race free if all its executions are data race free.

The memory model implies that all executions of all data race free programs are sequentially consistent.

# Compiler Guidelines

Given a host-defined notion of observable behavior of programs, the following restrictions apply to compiler transforms for non-atomics operations.

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

The following additional restrictions apply to compiler transforms for atomic operations.

  - API calls resulting in `"SeqCst"` events that affect observable behavior may not be reordered.

The following additional restriction apply to compiler transforms for data race free programs.

  - API calls resulting in shared memory events that do not affect observable behavior may not be transformed to API calls that result in shared memory events that affect observable behavior.

Draft Note: This provisio is intended to prohibit transforms that leak information.

# Code Generation Guidelines

For architectures no weaker than ARM or Power, non-atomic stores and loads may be compiled to bare stores and loads on the target architecture. Atomic stores and loads may be compiled down to instructions that guarantee sequential consistency. If no such instructions exist, memory barriers are to be employed, such as placing barriers on both sides of a bare store or load.

# TODO

- Litmus tests examples
