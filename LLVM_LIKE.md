# Introduction

SharedArrayBuffer provides two strengths of memory operations: atomic and non-atomic. Correctly synchronized atomic operations are sequentially consistent, i.e., there is a global total ordering of memory operations that all agents observe. Non-atomic operations are globally unordered, i.e. they are only ordered by sequential agent order. Incorrectly synchronized atomic operations, such as two racing writes to overlapping but not equal location ranges, behave as if they were non-atomic. Currently, no semantics between the two strengths, such as release-acquire, is supported.

We hope this enables non-atomic operations to be compiled to bare stores and loads on target architectures, and atomics to be compiled to ensure sequential consistency in the usual way (such as double fencing).

The memory consistency model (hereinafter "memory model") aims to define the ordering of shared memory operations. The model is axiomatic, takes significant inspiration from LLVM, and should also be familiar to readers who have read C++'s memory model. An axiomatic model also allows for flexibility in supporting multiple, possibly noncomparable weak consistency models in hardware such as those of ARM and Power.

# Model

The memory model describes the allowed orderings of SharedArrayBuffer events. We represent events as calls to ReadSharedMemory(_order_, _block_, _byteIndex_, _elementSize_) and WriteSharedMemory(_order_, _block_, _byteIndex_, _elementSize_, _bytes_) metafunctions that occur during evaluation.

Let the range of an event be the byte locations starting at _byteIndex_, ending at _byteIndex_ + _elementSize_, inclusive. We talk of these ranges being overlapping, equal, subsumes, or disjoint, which mean the usual things.

These events are ordered by two relations: happens-before and reads-from, defined mutually recursively as follows.

### agent-order

  The total order of SharedArrayBuffer events in a single agent during a particular evaluation of the program.

### synchronizes-with

  A partial order between pairs of atomic events such that:

  1. For each a ReadSharedMemory event _R_ with _order_ `"SeqCst"` that reads-from a WriteSharedMemory event _W_ event with order `"SeqCst"`:
    1. There is an edge from _R_ to _W_ iff _R_ and _W_ have the same range.

  NOTE: Only correctly synchronized pairs of atomic reads and writes synchronizes-with each other. Racing atomic operations on overlapping ranges do not synchronizes-with each other.

### happens-before

  The least partial order that is a superset of agent-order and includes all edges in synchronizes-with.

### reads-from

  A relation with edges between ReadSharedMemory events to one or more WriteSharedMemory such that for each read event _R_ that reads-from some set of write events _Ws_:

  1. For each byte location in _R_'s range:
    1. There is a _W_ in _Ws_ that includes the byte location in its range, and
    1. All other events in Ws have ranges that overlap with the range of _W_ but are not equal to or subsumed by it, and
    1. It is not the case that _R_ happens-before _W_, and
    1. There is no _W2_ such that _W_ happens-before _W2_ and _W2_ happens-before _R_.

[[[ I don't think the second clause is correct.  (Maybe you meant _R_ not _W_?)  Consider a halfword read, with two writes that each write a byte of that halfword.  (Or did you mean the selection of events in _Ws_ that overlap with _W_?) ]]]

  NOTE: A correctly synchronized atomic ReadSharedMemory event will always read from a single atomic WriteSharedMemory event on the same range. Non-atomic events or racing atomic events on overlapping ranges may read a set of bytes composed from multiple write events.

### Candidate Executions

We call a happens-before relation together with a reads-from relation a candidate execution of an agent cluster. For each program there may be many candidate executions, some of which the memory model disallows. We disallow candidate executions which exhibit "out of thin air" reads and lack sequential consistency for events with non-overlapping and non-subsuming ranges with _order_ `"SeqCst"`.

### No Out of Thin Air Reads

  Let depends-on be relation on shared memory events that is consistent with agent-order and captures data and control dependencies between events. A candidate execution has no out of thin air reads if there is no cycle in the union of reads-from and depends-on.

  Draft Note: This is intentionally underspecified. Precisely capturing and forbidding OOTA is currently an open problem.

### Sequentially Consistent Atomics

  A candidate execution has sequentially consistent atomics if there is a total order memory-order on events consistent with happens-before and such that:

  1. If a ReadSharedMemory event _R_ with _order_ `"SeqCst"` reads-from a WriteSharedMemory event _W_ with _order_ `"SeqCst"` and _R_ and _W_ have the same range, there is no WriteSharedMemoryEvent _W2_ with the same range such that _R_ is memory-order before _W2_ and _W2_ is memory-order before _W_.

  NOTE: Unlike C++, there is no total memory ordering for all `"SeqCst"` events. Executions do not require that overlapping events that race are totally ordered.

[[[ Define "race" properly, because I think the term is hiding something. ]]]

### Valid Executions

A candidate execution is valid (hereinafter an "execution") if it has no out of thin air reads and has sequentially consistent atomics.

### Semantics of ReadSharedMemory and WriteSharedMemory

Given an execution, the semantics of ReadSharedMemory and WriteSharedMemory is as follows.

ReadSharedMemory(_order_, _block_, _byteIndex_, _elementSize_)

  1. Let _Ws_ be the set of write events that this ReadSharedMemory event reads-from.
  1. If _Ws_ is the empty set, then:
    1. Return the initial value in _block_.
    1. Draft Note: Need to talk about initialization.
  1. Otherwise, if _Ws_ is a singleton set of WriteSharedMemory(_order2_, _block_, _byteIndex_, _elementSize_, _bytes_), then:
    1. Return _bytes_.
  1. Otherwise, let _v_ be 0.
  1. For _l_ from 0 to _elementSize_:
    1. Choose a _W_ from _Ws_ that has the byte location _byteIndex_ + _l_ in its range.
    1. Assert that such a _W_ exists.
    1. Let the _l_th byte in v be W's value for the _l_th byte in its _bytes_.
  1. Return _v_.

[[[ This destroys access-atomicity for racing compatible writes because any _W_ from _Ws_ may be chosen for any byte of the result, mingling results in a way we do not want. IIUC, _Ws_ will contain all writes that are not ordered, even if they have the same range.  ]]]

NOTE: These are not runtime semantics. Weak consistency models permit causality paradoxes and non-multiple copy atomic observable behavior that are not representable in the non-speculative step-by-step semantics labeled "Runtime Semantics" in ECMA262. Thought of another way, sequential evaluation of a single agent gives an initial partial ordering to ReadSharedMemory and WriteSharedMemory events. These events, and events from every other agent in the agent cluster, must be partially ordered with each other according to the rules above, and then the order must be validated. ReadSharedMemory and WriteMemoryEvents are only well-defined when given a valid execution.

# Implementation Guidelines

For architectures no weaker than ARM or Power, non-atomic stores and loads may be compiled to bare stores and loads on the target architecture. Atomics may be compiled down to instructions that guarantee sequential consistency. If no such instructions exist, memory barriers are to be employed, such as placing barriers on both sides of a bare store or load.

The following restrictions apply to compiler transforms for non-atomics.

  - An API call resulting in a single ReadSharedMemory event cannot be transformed into API calls resulting in multiple ReadSharedMemory events.
  - An API call resulting in a single WriteSharedMemory event cannot be transformed into API calls resulting in multiple WriteSharedMemory events.
  - API calls resulting in WriteSharedMemory events may not have its range changed.
  - API calls resulting in WriteSharedMemory events may not store a value that would not have otherwise been stored.

[[[ The first bullet is too strong -- it should be legal to do redundant reads.  The third bullet is probably too strong -- it should be legal to combine writes to adjacent bytes into a single write, for example. ]]]

The following restrictions apply to compiler transforms for atomics.

  - API calls resulting in `"SeqCst"` operations may not be reordered.

# Conjectures

All executions of DRF programs are SC.

ARM and Power are expressible.

# TODO

- Litmus tests examples
- RMW
- No info leakage prose
- Flesh out conjectures
