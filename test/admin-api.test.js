'use strict';

describe('api', function () {

	var chai = require('chai');
	var expect = chai.expect;
	var assert = chai.assert;
	var request = require('request-promise');
	var fs = require('fs');
	var path = require('path');
	var createServer = require('../src/server');
	var mongo = require('promised-mongo');
	var E = require('linq');

	var database = "test-database";

	var conf = require('confucious');
	conf.pushEnv();
	conf.pushJsonFile("config.json");
	conf.pushArgv();
	conf.set('database', database);

	var db;
	var server;

	var collections = E.from(conf.get('endpoints'))
		.select(function (endpoint) {
			return endpoint.collection;
		})
		.toArray();

	beforeEach(function () {
		db = mongo(database, collections);
		return db.dropDatabase()
			.then(function () {
				return createServer(conf);
			})
			.then(function (newServer) {
				server = newServer;
			});
	});

	var closeServer =  function (server) {
		if (server) {
			return new Promise(function (resolve, reject) {
				console.log('Closing server...');
				server.close(function (err) {
					console.log('... server closed.');
					if (err) {
						reject(err);
						return;
					}

					resolve();
				});
			});
		}
		else {
			return Promise.resolve();
		}
	};

	var closeDatabase = function (db) {
		if (db) {
    		return db.close();
    	}
    	else {
    		return Promise.resolve();
    	}
	};

	afterEach(function () {
		var localServer = server;
		var localDb = db;
		db = null;
		server = null;

		return Promise.all([
				closeServer(localServer),
				closeDatabase(localDb),
			]);
	});

	var apiPrefix = 'http://localhost:3000/your-secret-key/api/v1/';

	//
	// HTTP GET request to a particular end point.
	//
	var getRequest = function (endPoint) {
		assert.isString(endPoint);

		var url = apiPrefix + endPoint;

		var requestOptions = {
			method: 'GET',
			uri: url,
			json: true,
		};

		console.log('HTTP GET: ' + url);
		
		return request(requestOptions);
	};

	//
	// HTTP POST request to a particular end point.
	//
	var postRequest = function (endPoint) {
		assert.isString(endPoint);

		var requestOptions = {
			method: 'POST',
			uri: apiPrefix + endPoint,
			json: true,
		};
		
		return request(requestOptions);
	};


	it('can retreive database collection via REST API', function () {

		var data = 'some-data';
		var collectionName = collections[0];
		return db[collectionName].insert({ data: data })
			.then(function () {
				return getRequest(collectionName);
			})
			.then(function (records) {
				expect(records.length).to.eql(1);

				var record = records[0];
				expect(record.data).to.eql(data);
			});
	});

});