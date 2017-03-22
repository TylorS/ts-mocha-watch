#!/usr/bin/env node 

var watch = require('./').watch

var argv = process.argv.slice(2)

var srcIndex = argv.indexOf('--src')
var srcPatterns = argv[srcIndex + 1].split(',') || void 0

var testIndex = argv.indexOf('--test')
var testPatterns = argv[testIndex + 1].split(',') || void 0

var requiresIndex = argv.indexOf('--requires')
var requires = argv[requiresIndex + 1].split(',') || void 0

watch(process.cwd(), srcPatterns, testPatterns, requires)