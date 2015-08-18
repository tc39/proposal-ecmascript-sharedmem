#!/bin/bash
#
# This script will create tc39/shmem.html from the spec sources.
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
else
    ecmarkup tc39/spec.html tc39/shmem.html    
fi
