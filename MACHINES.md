# Machine data

The purpose of this file is to record information about specific hardware, to support
the design process.  It will be good to make references to authoritative material
when possible.

NOTE: There is much hardware information in the older documents in the historical/ directory,
I will move it into this file as soon as I can.

## Interleaving atomic and non-atomic data

(From Issue #10)  The question is whether it is well-defined to
interleave atomic and non-atomic data on platforms that do not have byte and
halfword atomics and that may wish to implement those using RMW on word atomics.  This
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
