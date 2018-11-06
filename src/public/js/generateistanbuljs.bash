#!/bin/bash
ls -1 *.js | awk '{print "echo " $1 "; nyc instrument " $1 " istanbul"}' | bash
ls -1 apm/*.js | awk '{print "echo " $1 "; nyc instrument " $1 " istanbul"}' | bash