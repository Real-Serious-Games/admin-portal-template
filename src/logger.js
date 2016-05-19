'use strict';

var assert = require('chai').assert;
var conf = require('confucious');
var structuredLog = require('structured-log');
var consoleSink = require('structured-log/console-sink');
var httpSink = require('structured-log-http-sink');

var logConfig = structuredLog
    .configure()
    .enrich({ source: conf.get('log:source') })
    .writeTo(consoleSink());

var logsvr = conf.get('log:server');
if (logsvr) {
    logConfig = logConfig
    	.batch({ 
	    	batchSize: 1000,
	    	timeDuration: 1000,
	    })
	    .writeTo(httpSink({ 
    		url: logsvr
    	}));
}
    
module.exports = logConfig.create();