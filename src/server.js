'use strict';

var conf = require('confucious');
conf.pushEnv();
conf.pushJsonFile("config.json");
conf.pushArgv();

var express = require('express');
var bodyParser = require('body-parser');
var assert = require('chai').assert;
var argv = require('yargs').argv;
var mailer = require('./mailer');
var moment = require('moment');
var E = require('linq');
var fs = require('fs');
var path = require('path');
var uuid = require('node-uuid');
var extend = require('extend');
var log = require('./logger');
var mongo = require('promised-mongo');

var dbHost = conf.get('database');
var collections = E.from(conf.get('endpoints'))
	.select(function (endpoint) {
		return endpoint.collection;
	})
	.toArray();
var db = mongo(dbHost, collections);

var app = express();
app.use(bodyParser.json());

//
// Defines the version of the API.
//
var endPointPrefix = conf.get('endPointPrefix');

//
// Keeps the API secret. Poor mans security.
//
var secretKey = conf.get('secret');

var staticPath = path.join(__dirname, '../Client');
log.info('Serving static files from {StaticPath}', staticPath);
app.use('/' + secretKey, express.static(staticPath));

//
// Simple REST API that is used to confirm the API is operational.
//
app.get('/alive', function(req, res) {
	res.status(200).end();
});

//
// Log an incoming HTTP request.
//
var logRequest = function (type, url, req, log) {
	log.info('Incoming HTTP ' + type + ' to ' + req.originalUrl);
	log.info('Params:');
	log.info(JSON.stringify(req.params, null, 4));
	log.info('Query:');
	log.info(JSON.stringify(req.query, null, 4));
	log.info('Body:');
	log.info(JSON.stringify(req.body, null, 4));
};

//
// Log the success of a HTTP request.
//
var logRequestSuccess = function (type, url, req, res, log) {
	log.info('Success: HTTP ' + type + ' to ' + req.originalUrl);
};

//
// Log the failure of a HTTP request.
//
var logRequestFailure = function (type, url, req, res, error, log) {
	log.error('Failure: HTTP ' + type + ' to ' + url);
	log.error(error && error.stack || error);
};

//
// Wrapper for a generic HTTP request.
//
var http_request = function (type, url, log, callback) {

	var enrichedLog = log.enrich({ url: url, method: type });

	enrichedLog.info("HTTP " + type + ": " + url);

	app[type](url, function (req, res) {
		var requestId = uuid.v1();
		var enrichedLog2 = enrichedLog.enrich({ requestId: requestId });

		logRequest(type, url, req, enrichedLog2);
		return callback(req, res, enrichedLog2)
			.then(function () {
				logRequestSuccess(type, url, req, res, enrichedLog2);
			})
			.catch(function (ex) {
				logRequestFailure(type, url, req, res, ex, enrichedLog2);
				res.sendStatus(501);
			});
	});
};

//
// Wrapper for HTTP GET with enriched log.
//
var http_get = function (url, log, callback) {

	http_request('get', url, log, callback);
};

//
// Wrapper for HTTP POST with enriched log.
//
var http_post = function (url, log, callback) {

	http_request('post', url, log, callback);
};

//
// Wrapper for HTTP PUT with enriched log.
//
var http_put = function (url, log, callback) {

	http_request('put', url, log, callback);
};

//
// Wrapper for HTTP DEL with enriched log.
//
var http_delete = function (url, log, callback) {

	http_request('delete', url, log, callback);
};

//
// Generate CRUD endpoints for a database collection.
//
var generateCrudEndPoints = function (endPointName, collectionName, log) {

	assert.isString(endPointName);
	assert.isString(collectionName);

	//todo: add logging to say what is being done to the db.

	var urlPrefix = '/' + secretKey + endPointPrefix + '/';
	var enrichedLog = log.enrich({ "end-point": endPointName, "collection-name": collectionName })

	//todo: error check required fields.

	http_get(urlPrefix + endPointName, enrichedLog, function (req, res, log) {

		return db[collectionName].find()
			.count()
			.then(function (total) {
				// Used by ng-admin to know the total number of unpaginated entries.
				res.header('X-Total-Count', total);
			})
			.then(function () {
				var dbCursor = db[collectionName].find();

				if (req.query._sortField) {
					var sortField = req.query._sortField;
					var sortDir = req.query._sortDir || "DESC";
					var sortVar;
					if (sortDir === "ASC") {
						sortVar = -1;
					}
					else if (sortDir === 'DESC') {
						sortVar = 1;
					}
					else {
						throw new Error("Bad '_sortDir'.")
					}

					var sortParams = {};
					sortParams[sortField] = sortVar;
					log.info("Sort params {@SortParams}", sortParams);
					dbCursor = dbCursor.sort(sortParams)
				}

				if (req.query._perPage) {
					var page = parseInt(req.query._page) || 1;
					var perPage = parseInt(req.query._perPage);
					var skip = (page-1) * perPage;

					log.info("Skip: " + skip);
					log.info("Limit: " + perPage);

					dbCursor = dbCursor.limit(perPage).skip(skip);
				}

				return dbCursor.toArray();
			})
			.then(function (docs) {
				log.info("Retreived " + docs.length + " documents.");
				res.json(docs);
			});
	});

	http_get(urlPrefix + endPointName + '/:id', enrichedLog, function (req, res, log) {
		var id = mongo.ObjectId(req.params.id);
		return db[collectionName].findOne({ _id: id })
			.then(function (doc) {
				res.json(doc);
			});
	});

	http_post(urlPrefix + endPointName, enrichedLog, function (req, res, log) {
		return db[collectionName].insert(req.body)
			.then(function (doc) {
				res.json(doc);
			});
	});

	http_put(urlPrefix + endPointName + '/:id', enrichedLog, function (req, res, log) {
		var id = mongo.ObjectId(req.params.id);
		var doc = extend({}, req.body, { _id: id });
		return db[collectionName].update({ _id: id }, doc, { multi: false })
			.then(function () {
				res.sendStatus(200);
			});
	});

	http_delete(urlPrefix + endPointName + '/:id', enrichedLog, function (req, res, log) {
		var id = mongo.ObjectId(req.params.id);
		var justOne = true;
		return db[collectionName].remove({ _id: id }, justOne)
			.then(function () {
				res.sendStatus(200);
			});
	});
};

process.on('uncaughtException', function (err) {
    log.error('Uncaught Exception: ' + err.message + '\r\n' + err.stack);
});

var endpoints = conf.get('endpoints');
endpoints.forEach(function (endpoint) {
	generateCrudEndPoints(endpoint.name, endpoint.collection, log);
});

var server = app.listen(3000, function () {

	var host = server.address().address;
	var port = server.address().port;

    log.info('Admin portal server started, listening on https://{Host}:{Port}', host, port);
    log.info('Connecting to database {DatabaseHost}', dbHost);

	mailer.send({
	    subject: 'Admin portal server has started',
	    text: "Server started at " + moment(new Date()).format('LLL')
	});

});
