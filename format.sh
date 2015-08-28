#!/bin/bash
#
# This script will create tc39/shmem.html from the spec sources, and also
# create asmjs/asmjs_shmem.html from the ditto sources.
#
# First, you need to:
#
# Install io.js, because ecmarkup needs it:
#   Download installer from iojs.org and run it
#
# Install ecmarkup:
#   sudo npm install -g ecmarkup
#
# ecmarkup 1.6 or greater is required.

# Maybe io.js is not the default node, work around that if we can.

if [ $(which iojs) != "" ]; then
    PATH=$(dirname $(which iojs)):$PATH ecmarkup tc39/spec.html tc39/shmem.html
    PATH=$(dirname $(which iojs)):$PATH ecmarkup asmjs/asmjs_spec.html asmjs/asmjs_shmem.html
else
    ecmarkup tc39/spec.html tc39/shmem.html    
    ecmarkup asmjs_/spec.html asmjs/asmjs_shmem.html    
fi
