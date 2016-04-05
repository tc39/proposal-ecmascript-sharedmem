# Machine data

The purpose of this file is to record information about specific hardware, to support
the design process.  It will be good to make references to authoritative material
when possible.

NOTE: There is much hardware information in the older documents in the historical/ directory,
I will move it into this file as soon as I can.

## Interleaving atomic and non-atomic data

(From Issue #10)  The question is whether it is well-defined to
interleave atomic and non-atomic data on platforms that do not have byte and
half-word atomics and that may wish to implement those using RMW on word atomics.  This
comes down to the interaction of normal stores with exclusive stores.

- On ARM, a normal store clears any reservation it interacts with, and the reservation
  size is at least 8 bytes (ARMv7 manual).  Thus a RMW byte atomic that interacts with
  an adjacent non-atomic byte will be fine.  (Only an issue on very early ARMv6 and
  earlier architectures.)
- On MIPS, where we have word (and on MIPS64, doubleword) exclusives, the manual states
  that a normal store to a reserved address clears the reservation. 
- On Power8, the reservation size is 16 bytes and the manual states that a normal store
  to a reserved address clears the reservation.

In those cases a store to a byte next to an atomic byte can happen before the load-exclusive
or after the store-exclusive, and if it happens between the load-exclusive and the
store-exclusive then it will force a retry.

# General guidance

(NOTE: The following has been copied from the original proposal document and cleaned up only superficially.  Some of the information below is known to be incomplete and/or naive, it is annotated when I know there's a problem.)

Not all hardware supports atomic operations at every granularity we need. ARMv6 and MIPS32 do not provide 8-byte atomic operations, for example, and implementing the atomic operations on Float64Array on those platforms requires the use of other techniques. Usually it means resorting to an external lock (hidden within the implementation of the atomic operations).

(NOTE: There are no longer atomics on Float32Array or Float64Array.)

As far as an external lock is concerned, there are several approaches:

* A global lock (though not a global lock per type)
* A lock per SharedArrayBuffer (a crude sharded lock)
* A lock per address range (a more sophisticated sharded lock)
 
In the implementation, any atomic access from C++ (from an interpreter primitive, say) must use the same mechanism as an atomic access from jitted code. This is true for atomic accesses at all sizes but tends to work out because both the C++ compiler and the JIT use the obvious atomic instructions; for 64-bit accesses on platforms with no 64-bit atomics additional coordination is required.

If the hardware supports atomic operations at a granularity greater than what we need for a particular access then the atomic operation on the smaller size can be implemented using a read-modify-write sequence with the wider atomic operation.

(NOTE: This is only correct because of observations made in the earlier section, Interleaving atomic and non-atomic data.)

Implementing compareExchange on a LL/SC architecture is not straightforward. The primitive may only fail if the value in the cell is different from the expected value. However, in the case of LL/SC, the update will fail if the cell was written even with the old value. Thus the implementation of compareExchange must retry the update if the update failed but the cell contains the old value.

(NOTE: I suppose in that case, the compareExchange could be seen as having succeeded.)

A full barrier is not always needed before and/or after an operation that contains "atomically do".  Notably there is useful advice in the JSR133 cookbook [Cookbook] and on the Cambridge RelaxedMemory Concurrency Group's page about C++ atomics [C++11 mappings].  For example, the load in an Atomics.load() will need no barriers before it but LoadLoad and LoadStore barriers after it.

## asm.js mapping

Weakly ordered C++ atomic accesses can be mapped to the strongly ordered accesses defined above, at an occasional loss in performance.

Volatile C++ accesses, which are (arguably incorrectly) used for inter-thread communication in some x86 programs, must generally be mapped to Atomics.load and Atomics.store: JITs will usually hoist or common normal loads and stores. The mapping of volatiles to sequentially consistent atomics also hides the difference between weakly and strongly ordered hardware, which is possibly desirable in programs for the web. (If we later add support for relaxed atomics they may be used to implement volatile at lower cost.) A consequence of this is that volatiles are forced to be aligned, which they are not in C++, but this seems reasonable. PNaCl makes the same choice [PNaCl volatile].

C++ atomics on integral types (integer and char types) are defined to be initializable in the same way as the integral types, eg, with zero [C++11 atomics]. Our atomics can be used to implement C++ atomics for up to int32 size that have the same size as the underlying integral, which is useful (existing code may assume this). For other data types the translator can use techniques in the "General guidance" section.

C++ has additional templates, constants, and methods that are used to determine whether an atomic access will be implemented by a lock or by a lock-free primitive. Emscripten must expose this appropriately in its headers and must make up for the rest through code generation.

Some extensions to the asm.js spec are required to support shared views and inlined Atomics operations, these are in a companion document [asm.js additions].

## x86 and x86_64

Discussion based on the Intel manual set [Intel].

### Single-copy atomicity

The architecture is single-copy atomic in a large number of cases (volume 3A section 8.1.1): since the i486, for naturally aligned data up to four bytes; since the Pentium, for naturally aligned data up to eight bytes; since the P6, also for up to eight unaligned bytes as long as they are all within the same cache line; and since the Core 2 Duo, for up to eight unaligned bytes in general.  Note that SSE data, being 16 bytes, are not read or written atomically (to or from SSE registers) even when properly aligned.

### Memory consistency model

The memory model is not quite sequentially consistent; store-to-load consistency, where a load following a store must wait for the store to complete, must be implemented by the program with an explicit fence. (If the load is to the word being stored then the load will read the stored value without the fence). The model is known as TSO, total store order. There is a good paper by the Cambridge Relaxed Memory Concurrency Group describing the memory model [Cam cacm].

The fence is an MFENCE instruction on SSE2-equipped systems and later. On earlier systems it is a locked memory no-op;
Linux uses "LOCK; ADD [esp], 0".

### Synchronization

Synchronization is via LOCK-prefixed instructions such as CMPXCHG, ADD, and XADD, or via instructions where the lock is implicit, such as XCHG. These can be applied in various ways to reduce register pressure, get rid of loops, etc. On 32bit
systems these instructions work on data up to four bytes; on 64bit systems, on data up to eight bytes. Only integer registers can be targeted. CMPXCHG8B / CMPXCHG16B can be used to implement 8-byte compare-exchange on 32-bit systems and 16-byte compare-exchange on 64-bit systems.

The x86 family has a PAUSE instruction that improves the performance of spinlocks.

## ARM32 and ARM64

The discussion is based on the ARMv6M, ARMv7A, and ARMv8A architecture reference manuals [ARM].

### Single-copy atomicity

The ARMv6 manual states that 1, 2, and 4 byte aligned accesses are single-copy atomic. A few multi-word accesses are executed as sequences of single-copy atomic operations.

The ARMv7 manual states that 1, 2, and 4 byte aligned accesses are single-copy atomic, that LDREXD and STREXD (8 byte) aligned accesses are singlecopy atomic, and aligned LDRD and STRD are single-copy atomic when the processor has support for LPAE (standard with Cortex-A15 and later). A number of multi-word accesses are executed as sequences of single-copy atomic accesses.

The ARMv7 manual also says that when two stores of different size are racing to the same location and they would otherwise be single-copy atomic, then bets are off about atomicity.

The ARMv8 manual states that 8 byte aligned accesses (in 64bit mode) are single-copy atomic, and that LDREXD and STREXD (16 byte) aligned accesses are single-copy atomic if the store is used with the load and the store succeeds.  The ARMv8 manual also states that single-copy atomicity is guaranteed only for instructions that target general-purpose registers, ie, is not guaranteed for direct floating-point loads and stores or for SIMD data.  More discussion at [JMM atomicity].

### Memory consistency model

For practical purposes the architecture is weakly ordered; it is possible for some memory to be designated as "strongly ordered" but my understanding is that "normal" memory is weakly ordered.

There are two synchronization instructions, "DSB" which is a completion barrier (store has reached the coherent memory system) and "DMB" which is an ordering barrier (orders the write buffer). Each can take an "option"; the most interesting option is "ST", which so far as I understand can be used to create a cheaper StoreStore barrier. Only DMB is required for normal application software.

(NOTE: The story is more complicated than that.  DMB has some kind of transitivity built into it, in order to make memory properly coherent.)

ARMv6 makes the DSB and DMB operations available through coprocessor instructions [ARM barrier].

### Synchronization

Synchronization is via a family of load-exclusive/store-exclusive instructions (LDREX and STREX), for sizes of 1, 2, 4, and (since ARMv6K and on all ARMv7 and ARMv8 systems) 8 bytes. These do not imply any ordering of other memory operations.  ARMv8 additionally introduces a class of load-acquire and store-release instructions (LDAEX and STLEX), for sizes of 1, 2, 4, and 8 bytes. These imply memory ordering as well as exclusivity, and reduce the need to use DMB.

## POWER and PowerPC

Discussion based on the POWER5 / PowerPC 2.02 book set [PowerPC], which is quite dated. It appears to cover both 32bit and 64bit models.

### Single-copy atomicity

The architecture is single-copy atomic for naturally aligned accesses of 1, 2, 4, and 8 bytes (vol 2 section 1.4).

### Memory consistency model

Memory is weakly consistent, like ARM.  (In the literature, POWER appears to be considered the weakest of the mainstream architectures.)  The architecture has several barrier instructions. The most comprehensive, sync, orders all instructions preceding the barrier before any memory accesses succeeding the barrier. A cheaper instruction, lwsync, creates LoadLoad, LoadStore, and StoreStore barriers. The I/O barrier, eieio, can be used to create a StoreStore barrier by itself.

(NOTE: As for ARM, some transitivity is built into the sync instruction.)

### Synchronization

There are load-linked/store-conditional instructions (here called "load word and reserve" and "store word conditional") for 4-byte and 8-byte aligned data. Clearly the 4-byte version can be used to implement 8-bit and 16-bit operations using read-modify-write; the LL/SC reservation will work just fine for that.

A particular form of the NOP instruction can be used to effect a pause for the purpose of implementing spinlocks [PPC Pause].

## MIPS32

Discussion based on the MIPS32 Rev 5.03 manual set [MIPS32]. For practical purposes we can probably stick to Release 2 or later; Release 2 came in 2002, Release 3 in 2010.

### Single-copy atomicity

"Architecture rule B2", vol IIA sec B.4.1, suggests strongly that the memory model is at least single-copy atomic for naturally aligned data, because that section states that misaligned accesses are "not guaranteed to be atomic as observed from other threads, processors, and I/O devices".  It seems likely (based on prose I believe I saw elsewhere but cannot find again) that the memory model is single-copy atomic up to 64 bits, ie, floating point loads and stores are single-copy
atomic.

### Memory consistency model

The consistency model of MIPS32 appears to be implementation defined, and for practical purposes we should treat MIPS as weakly ordered and similar to ARM and Power. The following is based on the "Programming notes" for the SYNC instruction.

Evidently some implementations are strongly consistent, but that's not required, and the SYNC instruction performs various kinds of memory barriers (that are noops on SC systems).

The SYNC instruction can be used as-is to perform all barriers, or it can be configured with flags to only provide certain kinds of barriers (LoadLoad, LoadStore, etc, and sometimes a combination). Without an option the SYNC is a "completion barrier", it ensures that a write has actually gone out to the memory system. With an option the SYNC is an "ordering barrier", it ensures that reads and/or writes before the SYNC will touch the memory system before reads and/or writes after the SYNC.

### Synchronization

MIPS32 has a 32-bit LL/SC pair. Clearly this can be used to implement 8-bit and 16-bit operations using read-modify-write; the LL/SC reservation will work just fine for that.

(NOTE: That is only true because of constraints in "Interleaving atomic and non-atomic data", above.)

In Release 2.5 a PAUSE instruction was introduced that improves the performance of spinlocks. This release also introduced new options for the SYNC instruction. (Volume 1, section 2.1.2.2.)

# References

[ARM] ARM Architecture Reference Manual. Downloadable from http://infocenter.arm.com, free registration required.

[ARM barrier] Leif Lindholm, "Memory access ordering part 3 memory access ordering in the ARM Architecture"
http://community.arm.com/groups/processors/blog/2011/10/19/memoryaccessorderingpart3memoryaccessorderinginthearmarchitecture
; also comments on this draft by Lindholm.

[asm.js additions] asm.js: Semantic additions for shared memory and atomics: http://tc39.github.io/ecmascript_sharedmem/asmjs_shmem.html.

[C++11 atomics] C++11 standard, section [atomics.types.generic], paragraphs 4 and 5.

[C++11 mappings] http://www.cl.cam.ac.uk/~pes20/cpp/cpp0xmappings.html.

[Cam cacm] http://www.cl.cam.ac.uk/~pes20/weakmemory/cacm.pdf.

[Cookbook] JSR133 Cookbook for Compiler Writers. http://g.oswego.edu/dl/jmm/cookbook.html.

[Intel] "Intel® 64 and IA32 Architectures Software Developer’s Manual Volumes 1, 2A, 2B, and 3A: System Programming Guide, Part 1", March 2012.

[JMM atomicity] http://mail.openjdk.java.net/pipermail/jmmdev/2014February/000011.html with subsequent and following messages in that thread.

[MIPS32] MIPS Architecture For Programmers Volume IA, IIA, III, Revision 5.03, Sept 9, 2013. http://www.imgtec.com/mips/architectures/mips32.asp , free registration required.

[PNaCl volatile] https://developer.chrome.com/nativeclient/reference/pnaclccpplanguagesupport#volatilememoryaccesses.

[PowerPC] "PowerPC User Instruction Set Architecture" and "PowerPC Virtual Environment Architecture", version 2.02, January 2005. These describe the POWER5 architecture which coincided with PPC at that time. Downloaded free of charge from IBM: http://www.ibm.com/developerworks/systems/library/esarchguidev2.html.

[PPC pause] http://stackoverflow.com/questions/5425506/equivalentofx86pauseinstructionforppc.
