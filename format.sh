#!/bin/bash
#
# This script will create tc39/shmem.html from the spec sources, and also
# create asmjs/asmjs_shmem.html from the ditto sources.
#
# You need to:
#
# Install ecmarkup:
#   sudo npm install -g ecmarkup
#
# ecmarkup 1.6 or greater is required.

ecmarkup tc39/spec.html tc39/shmem.html    
ecmarkup tc39/synchronic.html tc39/synchronic-formatted.html    
ecmarkup asmjs/asmjs_spec.html asmjs/asmjs_shmem.html    
