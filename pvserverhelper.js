/*global PV, emit*/
'use strict';

/* jshint strict: true */
/* jshint node: true */
/* jshint unused: false */

var iconv = require('iconv-lite');
var fs = require('fs');
var prom = require('bluebird');
var mongodb = require('mongodb');
var pvserver = require('pvserver');
var request = require('request');
var Converter = require('csvtojson').Converter;
var path = require('path');

require('pvjs');

module.exports = {
    sessionJsapiCache: {},

    addOrGetSessionJsapiObject: function(jsapi, sessionId) {
        if (this.sessionJsapiCache.hasOwnProperty(sessionId)) {
            return this.sessionJsapiCache[sessionId];
        } else {
            jsapi.isCached = true;
            this.sessionJsapiCache[sessionId] = jsapi;
            return jsapi;
        }
    },

    getSessionJsapiObject: function(jsapi, sessionId) {
        if (PV.isObject(this.sessionJsapiCache[sessionId])) {
            return this.sessionJsapiCache[sessionId];
        } else {
            return jsapi;
        }
    },

    removeSessionJsapiObject: function(jsapi, sessionId) {
        if (PV.isObject(this.sessionJsapiCache[sessionId])) {
            var cachedJsapi = this.sessionJsapiCache[sessionId];
            cachedJsapi.isCached = null;
            delete this.sessionJsapiCache[sessionId];
            return cachedJsapi;
        } else {
            return jsapi;
        }
    },

    cleanupForNonCached: function(jsapi) {
        if (PV.isBoolean(jsapi.isCached) && jsapi.isCached) {

        } else {
            this.cleanup(jsapi);
        }
    },

    serializePromises: function(workFunction, workContext, workArray) {
        var results = [];
        return new prom(function(resolve, reject) {
            var func = workFunction;
            var context = workContext;
            var next = function(curIndex) {
                if (curIndex < workArray.length) {
                    if (PV.isArray(workFunction)) {
                        func = workFunction[curIndex];
                    }
                    if (PV.isArray(workContext)) {
                        context = workContext[curIndex];
                    }

                    func.apply(context, workArray[curIndex]).then(function(result) {
                        results.push(result);

                        setImmediate(function() {
                            next(curIndex + 1);
                        });
                    }).catch(function(err) {
                        reject(err);
                    });
                } else {
                    resolve(results);
                }
            };

            try {
                next(0);
            } catch (err) {
                reject(err);
            }
        });
    },

    cleanup: function(jsapi) {
        if (jsapi.mongoConn) {
            jsapi.mongoConn.close();
            jsapi.mongoConn = null;
        }

        if (jsapi.sfdcConn) {
            if (PV.isObject(jsapi.sfdc) === false || jsapi.sfdc.isSession !== true) {
                jsapi.sfdcConn.logout();
            }
            jsapi.sfdcConn = null;
        }

        if (jsapi.pv) {
            jsapi.pv.logout();
            jsapi.pv = null;
        }
    },

    returnImmediately: function(callback) {
        throw {
            'code': 'RETURN_IMMEDIATELY',
            'callback': function() {
                callback(null, null);
            }
        };
    },

    scriptErrHandler: function(jsapi, callback, passError) {
        var fn = function(err) {

            this.cleanupForNonCached(jsapi);

            if (PV.isString(err.message)) {
                err.message = err.message;
            } else if (PV.isString(err.Message)) {
                err.message = err.Message;
            } else if (PV.isFunction(err.message)) {
                err.message = err.message();
            } else {
                err.message = 'No Relevant Message';
            }

            if (PV.isString(err.code)) {
                err.code = err.code;
            } else if (PV.isString(err.Code)) {
                err.Code = err.Code;
            } else if (PV.isFunction(err.code)) {
                err.code = err.code();
            } else {
                err.code = 'JSAPI2_UNKNOWN_ERROR';
            }

            if (err.code === 'RETURN_IMMEDIATELY' && typeof(err.callback) === 'function') {
                err.callback();
            } else {
                if (PV.isBoolean(passError) && passError) {
                    callback(null, {
                        'code': `${err.code}`,
                        'message': `${err.message}`
                    });
                } else {
                    callback({
                        'code': `${err.code}`,
                        'message': `${err.message}`
                    }, null);
                }
            }
        }.bind(this);
        return fn;
    },

    genericErrHandler: function(jsapi, callback, passError) {
        var fn = function(err) {
            this.cleanupForNonCached(jsapi);

            if (PV.isBoolean(passError) && passError) {
                callback(null, {
                    'code': 'JSAPI2_UNKNOWN_ERROR',
                    'message': `The function encountered an unknown error.\n${JSON.stringify(err)}\n`
                });
            } else {
                callback({
                    'code': 'JSAPI2_UNKNOWN_ERROR',
                    'message': `The function encountered an unknown error.\n${JSON.stringify(err)}\n`
                }, null);
            }
        }.bind(this);
        return fn;
    },

    setupLogger: function(jsapi, timeStamp) {
        if (PV.isObject(jsapi.logger) === false) {
            jsapi.logger = {
                timeStamp: timeStamp
            };
        }
        jsapi.logger.info = function(message) {
            var timedMsg = '';
            if (jsapi.logger.timeStamp === true) {
                timedMsg = PV.getTimeStamp() + ' - ' + message;
            } else {
                timedMsg = message;
            }
            if (PV.isObject(jsapi.logger) && PV.isFunction(jsapi.logger.log)) {
                jsapi.logger.log('info', timedMsg);
            } else if (PV.isFunction(jsapi.log)) {
                jsapi.log('info', timedMsg);
            } else {
                console.log('INFO: ' + timedMsg);
            }
        };
        jsapi.logger.error = function(error, throwError) {
            var message = 'ERROR';
            if (PV.isString(error.message)) {
                message = error.message;
            } else if (PV.isString(error.Message)) {
                message = error.Message;
            }

            var timedMsg = '';
            if (jsapi.logger.timeStamp === true) {
                timedMsg = PV.getTimeStamp() + ' - ' + message;
            } else {
                timedMsg = message;
            }
            if (PV.isObject(jsapi.logger) && PV.isFunction(jsapi.logger.log)) {
                jsapi.logger.log('error', timedMsg);
            } else if (PV.isFunction(jsapi.log)) {
                jsapi.log('error', timedMsg);
            } else {
                console.log('ERROR: ' + timedMsg);
            }
            if (throwError !== false) {
                throw error;
            }
        };
        jsapi.logger.startTime = function(message) {
            var timerObj = {
                startTime: new Date(),
                message: message
            };
            return timerObj;
        };
        jsapi.logger.endTime = function(timerObj) {
            var timedMsg = timerObj.message;
            var endTime = new Date();
            var elapsedTime = (endTime - timerObj.startTime) / 1e3;
            timedMsg = timedMsg + ' - ElaspedTime: ' + elapsedTime + 's';
            if (PV.isObject(jsapi.logger) && PV.isFunction(jsapi.logger.log)) {
                jsapi.logger.log('TIMER', timedMsg);
            } else if (PV.isFunction(jsapi.log)) {
                jsapi.log('error', timedMsg);
            } else {
                console.log('TIMER: ' + timedMsg);
            }
        };
    },

    convertFile: function(source, target, options, decoding, encoding) {
        return new prom(function(resolve, reject) {
            var rd = fs.createReadStream(source);
            var wr = fs.createWriteStream(target);

            if (PV.isObject(options) === false) {
                options = {};
            }

            this.convertStream(rd, wr, resolve, reject, options, decoding, encoding);
        }.bind(this));
    },

    convertStream: function(rd, wr, successCallback, failureCallback, options, decoding, encoding) {
        var converter = null;
        if (PV.isObject(options)) {
            converter = new Converter(options);
        }

        rd.on('error', rejectCleanup);
        wr.on('error', rejectCleanup);

        function rejectCleanup(err) {
            rd.destroy();
            wr.end();
            failureCallback(err);
        }
        wr.on('finish', successCallback);

        if (PV.isString(decoding) && PV.isString(encoding)) {
            if (PV.isObject(options)) {
                rd.pipe(iconv.decodeStream(decoding))
                    .pipe(iconv.encodeStream(encoding))
                    .pipe(converter)
                    .pipe(wr);
            } else {
                rd.pipe(iconv.decodeStream(decoding))
                    .pipe(iconv.encodeStream(encoding))
                    .pipe(wr);
            }
        } else if (PV.isObject(options)) {
            rd.pipe(converter).pipe(wr);
        } else {
            rd.pipe(wr);
        }
    },

    execServlet: function(jsapi, username, password, operation, params, headers) {
        var options = {
            headers: {
                'user-agent': 'pvserverhelper',
                'content-type': 'application/x-www-form-urlencoded',
                'cache-control': 'no-cache',
                'pragma': 'no-cache',
                'authorization': 'Basic ' + new Buffer(username + ':' + password).toString('base64')
            }
        };
        if (PV.isObject(headers)) {
            for (var headerKey in headers) {
                if (headerKey !== 'authorization') {
                    options.headers[headerKey] = headers[headerKey];
                }
            }
        }
        options.url = jsapi.pv.urlScheme + '://' + jsapi.pv.hostName + ':' + jsapi.pv.hostPort + '/admin/' + operation;

        if (PV.isObject(params)) {
            var args = [];
            for (var paramKey in params) {
                args.push(paramKey + '=' + params[paramKey]);
            }
            options.url = options.url + '?' + args.join('&');
        }

        options.method = 'POST';
        return this.httpMethod(options);
    },

    httpMethod: function(options) {
        return new prom(function(resolve, reject) {
            request(options, function(err, httpResponse, body) {
                if (err) {
                    reject(err);
                } else {
                    resolve(body);
                }
            });
        });
    },

    exec: function(jsapi, cmd, options) {
        return new prom(function(resolve, reject) {
            try {
                var exec = require('child_process').exec;
                if (PV.isObject(options) === false) {
                    options = {
                        maxBuffer: 1024 * 500
                    };
                }
                exec(cmd, options, function(error, stdout, stderr) {
                    if (error) {
                        reject(error);
                    } else {
                        jsapi.logger.info('stdout: ' + stdout, true);
                        jsapi.logger.info('stderr: ' + stderr, true);
                        resolve();
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    },

    bulkExecute: function(bulk) {
        return new prom(function(resolve, reject) {
            bulk.execute(function(err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    },

    dropSomeCollections: function(jsapi, matchFunction) {
        return jsapi.mongoConn.listCollections({}).toArray().then(function(result) {
            var promises = [];
            result.forEach(function(collection) {
                if (matchFunction(collection.name)) {
                    promises.push(jsapi.mongoConn.collection(collection.name).dropAsync());
                }
            });
            return prom.all(promises);
        });
    },

    dropCollection: function(jsapi, collectionName) {
        return jsapi.mongoConn.listCollections({
            name: collectionName
        }).toArray().then(function(result) {
            if (result.length > 0) {
                return jsapi.mongoConn.collection(collectionName).dropAsync();
            } else {
                return;
            }
        });
    },

    createCollection: function(jsapi, collectionName, drop, indices) {
        return jsapi.mongoConn.listCollections({
            name: collectionName
        }).toArray().then(function(result) {
            if (result.length === 0) {
                return jsapi.mongoConn.createCollectionAsync(collectionName);
            } else if (drop) {
                return jsapi.mongoConn.collection(collectionName).dropAsync();
            } else {
                return false;
            }
        }).then(function(result) {
            if (PV.isObject(result)) {
                return result;
            } else if (drop) {
                return jsapi.mongoConn.createCollectionAsync(collectionName);
            } else {
                return;
            }
        }).then(function(result) {
            if (PV.isObject(result) && (PV.isArray(indices)) || PV.isObject(indices)) {
                return this.createIndices(jsapi, collectionName, indices);
            } else {
                return result;
            }
        }.bind(this));
    },

    createIndices: function(jsapi, collectionName, indices) {
        var promises = [];
        var keys = {};
        var options = {};

        if (PV.isArray(indices)) {
            indices.forEach(function(index) {
                keys = index.keys;
                if (PV.isObject(keys)) {
                    options = index.options;
                    if (PV.isObject(options) === false) {
                        options = {};
                    }
                    promises.push(jsapi.mongoConn.collection(collectionName).ensureIndexAsync(keys, options));
                }
            });
        } else if (PV.isObject(indices)) {
            for (var prop in indices) {
                keys = {};
                options = {};
                if (prop !== '_id_') {
                    var indicesInfo = indices[prop];

                    options.name = prop;

                    for (var i = 0; i < indicesInfo.length; i++) {
                        var index = indicesInfo[i];
                        keys[index[0]] = index[1];
                    }

                    promises.push(jsapi.mongoConn.collection(collectionName).ensureIndexAsync(keys, options));
                }
            }
        }

        return prom.all(promises);
    },

    // this replaces your source collection with a projection that includes the lookup fields
    // lookupField: field in lookupCollectionName that is being looked up
    // sourceKey: field in sourceCollectionName used as a key to match with lookupCollectionName
    // lookupKey: fields in lookupCollectionName used $project to construct a key that matches sourceKey
    // defaultValue: a $set value used to set a default for the lookupField
    // rename: field that the lookup will be set to, defaulted to lookupField
    // tag: field that will be tagged true if lookup applied
    // var lookupInfo = {
    //     'lookupField': {
    //         sourceKey: 'sourceKey',
    //         lookupKey: {
    //             $toUpper: {
    //                 $concat: ['$lookupProperty1', '-', '$lookupProperty2']
    //             }
    //         },
    //         defaultValue: 'defaultValue',
    //         rename: 'rename',
    //         tag: 'tag'
    //     }
    // };
    aggregateLookup: function(jsapi, sourceCollectionName, lookupCollectionName, lookupInfo, lookupOperations) {
        var timestamp = PV.createHash(PV.getTimeStamp());
        var tempLookupCollection = 'AG_' + PV.createHash(lookupCollectionName + '_' + timestamp);
        var tempSourceCollection = 'AG_' + PV.createHash(sourceCollectionName + '_' + timestamp);

        var lookupDuplicate = [];
        var indices = [];

        var project = {
            _id: 0
        };
        for (var lookupField in lookupInfo) {
            project[lookupField] = '$' + lookupField;

            var lookup = lookupInfo[lookupField];
            var lookupKeyString = JSON.stringify(lookup.lookupKey);

            var lookupKey = PV.createHash(lookupKeyString + '1_' + timestamp);
            if (lookupDuplicate.indexOf(lookupKeyString) === -1) {
                project[lookupKey] = PV.isString(lookup.lookupKey) ? '$' + lookup.lookupKey : lookup.lookupKey;
                lookupDuplicate.push(lookupKeyString);
                var keys = {};
                keys[lookupKey] = 1;
                indices.push({
                    keys: keys
                });
            }
        }
        lookupDuplicate = [];

        var promises = [];
        promises.push(jsapi.mongoConn.collection(sourceCollectionName).indexInformationAsync());
        promises.push(this.createCollection(jsapi, tempLookupCollection, true, indices));

        return prom.all(promises).then(function(results) {
            var pipeline = [];
            if (PV.isArray(lookupOperations)) {
                lookupOperations.forEach(function(operation) {
                    pipeline.push(operation);
                });
            }

            pipeline.push({
                $project: project
            });

            pipeline.push({
                $out: tempLookupCollection
            });

            var promises = [];
            promises.push(this.getAggregateProjectMapping(jsapi, sourceCollectionName));
            promises.push(this.createCollection(jsapi, tempSourceCollection, true, results[0]));
            promises.push(jsapi.mongoConn.collection(lookupCollectionName).aggregateAsync(pipeline, {
                allowDiskUse: true
            }));

            return prom.all(promises);
        }.bind(this)).then(function(results) {
            var project = results[0];

            var pipelineLookup = [];
            var pipelineUnwind = [];

            var tempKeyDuplicate = [];

            for (var lookupField in lookupInfo) {
                var lookup = lookupInfo[lookupField];
                var lookupKeyString = JSON.stringify(lookup.lookupKey);

                var lookupKey = PV.createHash(lookupKeyString + '1_' + timestamp);
                var tempKey = PV.createHash(lookup.sourceKey + '2_' + timestamp);
                var lookupFieldKey = PV.createHash(lookupField + '3_' + timestamp);
                if (lookupDuplicate.indexOf(lookupKeyString) === -1 && tempKeyDuplicate.indexOf(tempKey) === -1) {
                    pipelineLookup.push({
                        $lookup: {
                            from: tempLookupCollection,
                            localField: lookup.sourceKey,
                            foreignField: lookupKey,
                            as: tempKey
                        }
                    });

                    pipelineUnwind.push({
                        $unwind: {
                            path: '$' + tempKey,
                            preserveNullAndEmptyArrays: true
                        }
                    });
                }

                project[lookupFieldKey] = '$' + tempKey + '.' + lookupField;

                if (lookupDuplicate.indexOf(lookupKeyString) === -1) {
                    lookupDuplicate.push(lookupKey);
                }
                if (tempKeyDuplicate.indexOf(tempKey) === -1) {
                    tempKeyDuplicate.push(tempKey);
                }
            }

            var pipeline = pipelineLookup.concat(pipelineUnwind);

            pipeline.push({
                $project: project
            });
            pipeline.push({
                $out: tempSourceCollection
            });

            return jsapi.mongoConn.collection(sourceCollectionName).aggregateAsync(pipeline, {
                allowDiskUse: true
            });
        }.bind(this)).then(function() {
            var promises = [];

            promises.push(this.dropCollection(jsapi, tempLookupCollection));
            promises.push(this.dropCollection(jsapi, sourceCollectionName));

            var bulk = jsapi.mongoConn.collection(tempSourceCollection).initializeOrderedBulkOp();
            for (var lookupField in lookupInfo) {
                var lookup = lookupInfo[lookupField];
                var lookupFieldKey = PV.createHash(lookupField + '3_' + timestamp);

                var defaultValue = lookup.defaultValue;
                if (PV.isNull(defaultValue) === false && PV.isUndefined(defaultValue) === false) {
                    var filter = {};
                    filter[lookupFieldKey] = {
                        $exists: false
                    };
                    var set = {};
                    set[PV.isString(lookup.rename) ? lookup.rename : lookupField] = defaultValue;

                    bulk.find(filter).update({
                        $set: set
                    });
                }

                var rename = {};
                rename[lookupFieldKey] = PV.isString(lookup.rename) ? lookup.rename : lookupField;

                var filter2 = {};
                filter2[lookupFieldKey] = {
                    $exists: true
                };

                var update = {
                    $rename: rename
                };
                if (PV.isString(lookup.tag)) {
                    var set = {};
                    set[lookup.tag] = true;
                    update.$set = set;
                }
                bulk.find(filter2).update(update);
            }
            if (bulk.length > 0) {
                promises.push(this.bulkExecute(bulk));
            }
            return prom.all(promises);
        }.bind(this)).then(function() {
            return jsapi.mongoConn.collection(tempSourceCollection).rename(sourceCollectionName);
        }.bind(this));
    },

    createExpressionMapping: function(objectOrArray, accumulator, aggregated, include_id) {
        var arr = null;
        if (PV.isArray(objectOrArray)) {
            arr = objectOrArray;
        } else if (PV.isObject(objectOrArray)) {
            arr = Object.keys(objectOrArray);
        }

        var project = {};
        if (PV.isArray(arr)) {
            arr.forEach(function(element) {
                var value = null;
                if (aggregated === true) {
                    value = '$_id.' + element;
                } else {
                    value = '$' + element;
                }
                if (PV.isString(accumulator)) {
                    project[element] = {};
                    project[element][accumulator] = value;
                } else {
                    project[element] = value;
                }
            });
        }
        if (include_id !== true) {
            project._id = 0;
        }
        return project;
    },

    find: function(jsapi, collectionName, id, projection) {
        var filter = {};
        if (PV.isString(id)) {
            filter._id = new mongodb.ObjectId.createFromHexString(id);
        } else if (PV.isObject(id)) {
            filter._id = id;
        }
        if (PV.isObject(projection) === false) {
            projection = {};
        }
        return jsapi.mongoConn.collection(collectionName).find(filter, projection).toArrayAsync();
    },

    copy: function(jsapi, sourceCollection, targetCollection, filter, projection, overwriteKey) {
        if (PV.isObject(filter) === false) {
            filter = {};
        }
        if (PV.isObject(projection) === false) {
            projection = {};
        }
        return jsapi.mongoConn.collection(sourceCollection).find(filter, projection).toArrayAsync().then(function(result) {
            if (result.length > 0) {
                if (PV.isString(overwriteKey)) {
                    var bulk = jsapi.mongoConn.collection(targetCollection).initializeOrderedBulkOp();
                    result.forEach(function(item) {
                        var filter2 = {};
                        filter2[overwriteKey] = item[overwriteKey];
                        bulk.find(filter2).remove();
                        bulk.insert(item);
                    });
                    return this.bulkExecute(bulk);
                } else {
                    return jsapi.mongoConn.collection(targetCollection).insertManyAsync(result);
                }
            } else {
                return result;
            }
        }.bind(this));
    },

    move: function(jsapi, sourceCollection, targetCollection, filter, cleanId) {
        var projection = {};
        if (cleanId === true) {
            projection = {
                _id: 0
            };
        }
        return this.copy(jsapi, sourceCollection, targetCollection, filter, projection).then(function(result) {
            if (PV.isObject(filter) === false) {
                return this.dropCollection(jsapi, sourceCollection);
            } else {
                return jsapi.mongoConn.collection(sourceCollection).removeAsync(filter);
            }
        }.bind(this));
    },

    getProperties: function(jsapi, collectionName) {
        var mapFunction = function() {
            for (var key in this) {
                emit(key, null);
            }
        };
        var reduceFunction = function(key, stuff) {
            return null;
        };
        var out = { out: { 'inline': 1 } };
        return jsapi.mongoConn.collection(collectionName).mapReduceAsync(mapFunction, reduceFunction, out).map(function(i) {
            return i._id;
        });
    },

    getAggregateProjectMapping: function(jsapi, collectionName, filter) {
        if (PV.isObject(filter) === false) {
            filter = {};
        }
        return this.getProperties(jsapi, collectionName).then(function(result) {
            return this.createExpressionMapping(result);
        }.bind(this));
    },

    cleanupChildren: function(jsapi, collectionName, id, childrenMap) {
        var projection = {};
        for (var child in childrenMap) {
            projection[childrenMap[child]] = 1;
        }

        return this.find(jsapi, collectionName, id, projection).then(function(result) {
            var promises = [];
            var set = {};

            for (var child in childrenMap) {
                var targets = result[0][childrenMap[child]];
                if (PV.isArray(targets)) {
                    set[childrenMap[child]] = [];
                } else {
                    set[childrenMap[child]] = null;
                }

                var filter = null;
                if (PV.isArray(targets)) {
                    filter = {
                        _id: {
                            $in: targets
                        }
                    };
                } else if (PV.isObject(targets)) {
                    filter = {
                        _id: targets
                    };
                }
                if (PV.isObject(filter)) {
                    promises.push(jsapi.mongoConn.collection(child).removeAsync(filter));
                }
            }

            var updateFilter = {};
            if (PV.isString(id)) {
                updateFilter._id = new mongodb.ObjectId.createFromHexString(id);
            } else if (PV.isObject(id)) {
                updateFilter._id = id;
            }

            promises.push(jsapi.mongoConn.collection(collectionName).updateOneAsync(updateFilter, {
                $set: set
            }));

            return prom.all(promises);
        });
    },

    isEmptyValue: function(value) {
        return PV.isNull(value) || PV.isUndefined(value) ||
            value === '-N/A-' || value === '- N/A -' ||
            (PV.isString(value) && value.trim().length === 0);
    },

    setCallbackTimeout: function(jsapi, timeout, callback) {
        setTimeout(function() {
            if (jsapi.callbackTracker !== true) {
                jsapi.callbackTracker = true;
                callback(null, null);
            }
        }, timeout);
    },

    checkCallbackTimeout: function(jsapi, callback) {
        if (jsapi.callbackTracker !== true) {
            jsapi.callbackTracker = true;
            callback(null, null);
        }
    },

    login: function(jsapi, protocol, host, port, username, password) {
        jsapi.logger.info('Logging in ' + protocol + '://' + host + ':' + port);
        jsapi.pv = new pvserver.PVServerAPI(protocol + '://' + host + ':' + port);
        return jsapi.pv.login(username, password, null).then(function(resp) {
            if (this.isResultOk(resp)) {
                return true;
            } else {
                jsapi.logger.error(this.getPVStatus(resp));
                return false;
            }
        }.bind(this));
    },

    loginWithSession: function(jsapi) {
        return new prom(function(resolve, reject) {
            if (PV.isObject(jsapi.pv) === false) {
                jsapi.pv = new pvserver.PVServerAPI(jsapi.PVSession.engineSessionInfo.url);
                jsapi.pv.login(null, null, jsapi.PVSession.engineSessionInfo.apiKey).then(function(resp) {
                    if (this.isResultOk(resp)) {
                        resolve(true);
                    } else {
                        jsapi.pv = null;
                        jsapi.logger.error(this.getPVStatus(resp));
                        resolve(false);
                    }
                }.bind(this));
            } else {
                resolve(true);
            }
        }.bind(this));
    },

    parseProviderModelUrl: function(url) {
        var info = {};

        var re = /:[\/][\/]([^\/]+)[\/]([^\/?]+)[?\/]?.*/;
        var m = null;
        if ((m = re.exec(url)) !== null) {
            var host = m[1].split('@');
            if (host.length > 1) {
                var auth = host[0].split(':');
                info.username = auth[0];
                info.password = auth[1];
                info.host = host[1];
            } else {
                info.username = null;
                info.password = null;
                info.host = m[1];
            }
            info.dbname = m[2];
        } else {
            info.host = null;
            info.dbname = null;
        }

        var reOptions = /[?](.*)/;
        if ((m = reOptions.exec(url)) !== null) {
            var allOptions = m[1];
            var options = allOptions.split('&');
            info.options = {};
            options.forEach(function(opt) {
                var opValues = opt.split('=');
                info.options[opValues[0]] = opValues[1];
            });
        } else {
            info.options = null;
        }

        return info;
    },

    getProviderModelInfo: function(jsapi, tag, params) {
        var infoTag = null;
        if (tag === 'MongoDB') {
            infoTag = 'mongo';
        } else if (tag === 'Salesforce') {
            infoTag = 'sfdc';
        }

        if (PV.isObject(jsapi[infoTag]) === false) {
            jsapi[infoTag] = {};
        }

        try {
            var providerModelInfo = jsapi.PVSession.engineSessionInfo.providerModelsByTag[tag];
            var connectionInfo = null;
            if (PV.isArray(providerModelInfo)) {
                var userId = params.userId;
                var appName = params.appName;
                var mongoDBHostName = params.mongoDBHostName;
                if (PV.isString(userId) && PV.isString(appName) && PV.isString(mongoDBHostName)) {
                    for (var i = 0; i < providerModelInfo.length; i++) {
                        if (providerModelInfo[i].userId === userId && providerModelInfo[i].appName === appName &&
                            providerModelInfo[i].mongoDBHostName === mongoDBHostName) {
                            connectionInfo = providerModelInfo[i];
                        }
                    }
                }
            } else if (PV.isObject(providerModelInfo)) {
                connectionInfo = providerModelInfo;
            }

            if (PV.isObject(connectionInfo)) {
                for (var prop in connectionInfo) {
                    jsapi[infoTag][prop] = connectionInfo[prop];
                }
            }
            jsapi.logger.info(infoTag + ' Engine Session Info');
        } catch (e1) {
            try {
                jsapi[infoTag].modelId = JSON.parse(params.OpRequest).PVRequest.Operation.Params.ProfitModel.text;
                jsapi.logger.info(infoTag + ' OpRequest');
            } catch (e2) {
                try {
                    var domain = tag.toUpperCase();
                    var models = JSON.parse(params.ProviderModels);
                    jsapi[infoTag].modelId = models[domain];
                    jsapi.logger.info(infoTag + ' ProviderModels');
                } catch (e2) {}
            }
        }

        return PV.isString(jsapi[infoTag].modelId);
    },

    createSalesforceProviderModel: function(jsapi, access_token, instance_url) {
        if (PV.isObject(jsapi.sfdc) === false) {
            jsapi.sfdc = {};
        }
        var dataSetQuery = {
            'Type': 'Salesforce',
            'KeyValue': [{
                'Key': 'access_token',
                'Value': access_token
            }, {
                'Key': 'instance_url',
                'Value': instance_url
            }]
        };
        jsapi.logger.info('Creating provider model with ' + access_token + ' on ' + instance_url);
        return jsapi.pv.sendRequest('CreateProviderModel', dataSetQuery).then(function(resp) {
            if (this.isResultOk(resp)) {
                var status = this.getPVStatus(resp);
                jsapi.sfdc.modelId = status.ModelId;
            } else {
                jsapi.sfdc.modelId = null;
                jsapi.logger.error(this.getPVStatus(resp));
                return false;
            }
        }.bind(this));
    },

    createMongoProviderModel: function(jsapi, username, appName, dbHostName, options) {
        return new prom(function(resolve, reject) {
            if (PV.isObject(jsapi.mongo) === false) {
                jsapi.mongo = {};
            }

            if (PV.isString(jsapi.mongo.url) && PV.isString(jsapi.mongo.host) && PV.isString(jsapi.mongo.dbname)) {
                jsapi.logger.info('Provider model id already already exist');
                resolve(this.getProviderModelUrl(jsapi, options));
            } else {
                var dataSetQuery = {
                    'Type': 'MongoDB',
                    'KeyValue': [{
                        'Key': 'userId',
                        'Value': username
                    }, {
                        'Key': 'appName',
                        'Value': appName
                    }, {
                        'Key': 'mongoDBHostName',
                        'Value': dbHostName
                    }]
                };

                jsapi.logger.info('Creating provider model with ' + username + ' for ' + appName + ' accessing ' + dbHostName);
                return jsapi.pv.sendRequest('CreateProviderModel', dataSetQuery).then(function(resp) {
                    if (this.isResultOk(resp)) {
                        var status = this.getPVStatus(resp);
                        jsapi.mongo.modelId = status.ModelId;
                        jsapi.logger.info('Getting provider model url with ' + status.ModelId);
                        resolve(this.getProviderModelUrl(jsapi, options));
                    } else {
                        jsapi.mongo.modelId = null;
                        jsapi.logger.error(this.getPVStatus(resp));
                        resolve(false);
                    }
                }.bind(this));
            }
        }.bind(this));
    },

    getProviderModelUrl: function(jsapi, options) {
        return new prom(function(resolve, reject) {
            if (PV.isString(jsapi.mongo.url) && PV.isString(jsapi.mongo.host) && PV.isString(jsapi.mongo.dbname)) {
                jsapi.logger.info('Mongo Host, Database and Url already exist');
                resolve(true);
            } else {
                return jsapi.pv.sendRequest('GetProviderModelUrl', {
                    'ProfitModel': jsapi.mongo.modelId
                }).then(function(resp) {
                    if (this.isResultOk(resp)) {
                        var status = this.getPVStatus(resp);
                        var info = this.parseProviderModelUrl(status.Url);

                        jsapi.mongo.host = info.host;
                        jsapi.mongo.dbname = info.dbname;

                        var optionsStr = PV.convertObjectToStr(options);
                        if (optionsStr !== '') {
                            if (status.Url.indexOf('?') === -1) {
                                optionsStr = '?' + optionsStr;
                            } else {
                                optionsStr = '&' + optionsStr;
                            }
                        }
                        jsapi.mongo.url = status.Url + optionsStr;

                        if (PV.isObject(info.options)) {
                            jsapi.mongo.options = info.options;
                        } else {
                            jsapi.mongo.options = null;
                        }
                        if (PV.isString(info.username)) {
                            jsapi.mongo.username = info.username;
                        } else {
                            jsapi.mongo.username = null;
                        }
                        if (PV.isString(info.password)) {
                            jsapi.mongo.password = info.password;
                        } else {
                            jsapi.mongo.password = null;
                        }

                        if (PV.isString(info.host) && PV.isString(info.dbname)) {
                            jsapi.logger.info('Mongo Host: ' + jsapi.mongo.host);
                            jsapi.logger.info('Mongo Database: ' + jsapi.mongo.dbname);
                            resolve(true);
                        } else {
                            jsapi.logger.error({
                                message: 'Unable to extract Mongo host from data source url',
                                code: 'Parsing Error'
                            });
                            resolve(false);
                        }
                    } else {
                        jsapi.mongo.url = null;
                        jsapi.mongo.host = null;
                        jsapi.mongo.dbname = null;
                        jsapi.mongo.options = null;
                        jsapi.mongo.username = null;
                        jsapi.mongo.password = null;
                        jsapi.logger.error(this.getPVStatus(resp));
                        resolve(false);
                    }
                }.bind(this));
            }
        }.bind(this));
    },

    setupMongoDBUrl: function(jsapi, serverHost, serverPort, serverUserId, serverPassword, serverAuthDatabase, database, options) {
        return new prom(function(resolve, reject) {
            if (PV.isObject(jsapi.mongo) === false) {
                jsapi.mongo = {};
            }
            if (PV.isString(jsapi.mongo.url) && PV.isString(jsapi.mongo.host) && PV.isString(jsapi.mongo.dbname)) {
                jsapi.logger.info('Mongo Host, Database and Url already exist');
                resolve(true);
            } else {
                if (PV.isString(serverHost) && PV.isString(database)) {
                    jsapi.mongo.host = serverHost;
                    jsapi.mongo.dbname = database;
                    var arr = [];
                    arr.push('mongodb://');

                    if (PV.isString(serverUserId)) {
                        arr.push(encodeURIComponent(serverUserId));
                        jsapi.mongo.username = serverUserId;
                        if (PV.isString(serverPassword)) {
                            arr.push(':' + encodeURIComponent(serverPassword));
                            jsapi.mongo.password = serverPassword;
                        } else {
                            jsapi.mongo.password = null;
                        }
                        arr.push('@');
                    } else {
                        jsapi.mongo.username = null;
                        jsapi.mongo.password = null;
                    }
                    arr.push(serverHost);

                    if (PV.isString(serverPort)) {
                        arr.push(':' + serverPort);
                    }
                    arr.push('/' + database);

                    var optionsStr = null;
                    if (PV.isString(serverAuthDatabase)) {
                        var optionsObj = {};
                        if (PV.isObject(options)) {
                            for (var k in options) {
                                optionsObj[k] = options[k];
                            }
                        }
                        optionsObj.authSource = serverAuthDatabase;

                        jsapi.mongo.options = optionsObj;
                        optionsStr = PV.convertObjectToStr(optionsObj);
                    } else {
                        if (PV.isObject(options)) {
                            jsapi.mongo.options = options;
                            optionsStr = PV.convertObjectToStr(options);
                        } else {
                            jsapi.mongo.options = null;
                        }
                    }

                    if (optionsStr !== '') {
                        arr.push('?' + optionsStr);
                    }
                    jsapi.mongo.url = arr.join('');
                    resolve(true);
                } else {
                    jsapi.mongo.url = null;
                    jsapi.mongo.host = null;
                    jsapi.mongo.dbname = null;
                    jsapi.mongo.options = null;
                    jsapi.mongo.username = null;
                    jsapi.mongo.password = null;
                    jsapi.logger.error({
                        message: 'Missing data source url parameters',
                        code: 'Bad Parameters'
                    });
                    resolve(false);
                }
            }
        });
    },

    createMongoDB: function(jsapi) {
        return new prom(function(resolve, reject) {
            if (PV.isObject(jsapi.mongoConn) === false) {
                if (PV.isObject(jsapi.mongo) && PV.isString(jsapi.mongo.url)) {
                    var MongoClient = prom.promisifyAll(mongodb);
                    MongoClient.connect(jsapi.mongo.url).then(function(dbconn) {
                        jsapi.mongoConn = dbconn;
                        resolve(true);
                    });
                } else {
                    jsapi.mongoConn = null;
                    jsapi.logger.error({
                        message: 'Missing data source url',
                        code: 'No Connection'
                    });
                    resolve(false);
                }
            } else {
                resolve(true);
            }
        });
    },

    getEntityGroupsAndFields: function(entity, entityArray) {
        var result = null;
        entityArray.forEach(function(obj) {
            if (obj.Name === entity) {
                result = obj;
            }
        });

        result.Groups = result.Groups.Group;
        result.Fields = result.Fields.Field;
        return result;
    },

    convertGroupOrFieldArrayForQueryParams: function(arr) {
        var uniqueArr = arr.filter(function(elem, index, self) {
            if (PV.isString(elem)) {
                return index === self.indexOf(elem);
            } else {
                return false;
            }
        });
        var newArray = [];
        uniqueArr.forEach(function(field) {
            if (PV.isString(field)) {
                newArray.push({
                    '_attrs': {
                        'name': 'Res1'
                    },
                    '_text': field
                });
            }
        });
        return newArray;
    },

    removeEntityRelationshipGroupAndFields: function(meta, entity, relationshipPatterns, not) {
        if (PV.isBoolean(not) === false) {
            not = false;
        }
        relationshipPatterns.forEach(function(pattern) {
            var relationPattern = entity + '_' + pattern;
            var reg = null;
            eval('reg=/' + relationPattern + '.+/i');
            var groups = meta.Groups;
            var i = 0;
            do {
                if (reg.test(groups[i])) {
                    if (not) {
                        i++;
                    } else {
                        groups.splice(i, 1);
                    }
                } else {
                    if (not) {
                        groups.splice(i, 1);
                    } else {
                        i++;
                    }
                }
            } while (i < groups.length);

            var fields = meta.Fields;
            var j = 0;
            do {
                if (reg.test(fields[j])) {
                    if (not) {
                        j++;
                    } else {
                        fields.splice(j, 1);
                    }
                } else {
                    if (not) {
                        fields.splice(j, 1);
                    } else {
                        j++;
                    }
                }
            } while (j < fields.length);
        });
    },

    getGroupsOrFieldsFromQueryParams: function(groupsOrFieldsParams) {
        var groupsOrFields = [];
        if (PV.isObject(groupsOrFieldsParams)) {
            var values = null;
            if (groupsOrFieldsParams.hasOwnProperty('Group')) {
                values = PV.ensureArray(groupsOrFieldsParams.Group);
            } else if (groupsOrFieldsParams.hasOwnProperty('Field')) {
                values = PV.ensureArray(groupsOrFieldsParams.Field);
            }

            if (PV.isArray(values) && values.length > 0) {
                values.forEach(function(value) {
                    if (PV.isString(value)) {
                        groupsOrFields.push(value);
                    } else if (PV.isObject(value)) {
                        if (PV.isString(value._text)) {
                            groupsOrFields.push(value._text);
                        } else if (PV.isString(value.text)) {
                            groupsOrFields.push(value.text);
                        }
                    }
                });
            }
        }
        return groupsOrFields;
    },

    getGroupValueFromQueryParams: function(queryParams, objectName, groupName) {
        var result = null;
        var regexp = /^([^=]+)=[']([^']+)[']$/i;
        try {
            var dp = queryParams.AndFilter;
            PV.ensureArray(dp.OrFilter).forEach(function(compTerm) {
                var category = compTerm._attrs.category;
                if ((!objectName || (!category || category === objectName)) && compTerm.AndFilter.Filter) {
                    PV.ensureArray(compTerm.AndFilter.Filter).forEach(function(filterTerm) {
                        var term = filterTerm;
                        if (PV.isObject(filterTerm) && filterTerm.hasOwnProperty('text')) {
                            term = filterTerm.text;
                        }
                        var matches = regexp.exec(term);
                        if (matches) {
                            var group = matches[1];
                            var value = matches[2];
                            if (group === groupName && value !== '[object Object]') {
                                result = value;
                            }
                        }
                    });
                }
            });
        } catch (ignore) {}
        return result;
    },

    getGroupValuesFromQueryParams: function(queryParams, objectName, groupName) {
        var result = [];
        var regexp = /^([^=]+)=[']([^']+)[']$/i;
        try {
            var dp = queryParams.AndFilter;
            PV.ensureArray(dp.OrFilter).forEach(function(compTerm) {
                var category = compTerm._attrs.category;
                if ((!objectName || (!category || category === objectName)) && compTerm.AndFilter.Filter) {
                    PV.ensureArray(compTerm.AndFilter.Filter).forEach(function(filterTerm) {
                        var term = filterTerm;
                        if (PV.isObject(filterTerm) && filterTerm.hasOwnProperty('text')) {
                            term = filterTerm.text;
                        }
                        var matches = regexp.exec(term);
                        if (matches) {
                            var group = matches[1];
                            var value = matches[2];
                            if (group === groupName && value !== '[object Object]') {
                                result.push(value);
                            }
                        }
                    });
                }
            });
        } catch (ignore) {}
        return result;
    },

    getLastComponentSelections: function(components) {
        var comps = PV.ensureArray(components);

        var lastSelections = null;
        for (var i = comps.length - 1; i >= 0; i--) {
            var component = comps[i];

            if (PV.isObject(component) && component.hasOwnProperty('Selection')) {
                var selections = [];
                if (PV.isArray(component.Selection)) {
                    selections = component.Selection;
                } else {
                    selections.push(component.Selection);
                }
                lastSelections = selections;
                break;
            }
        }
        return lastSelections;
    },

    getGroupValueFromGroupFilters: function(selections, groupName) {
        var values = [];
        var groupFilter = null;
        if (PV.isArray(selections)) {
            for (var i = 0; i < selections.length; i++) {
                if (PV.isObject(selections[i]) && selections[i].hasOwnProperty('GroupFilter')) {
                    groupFilter = selections[i].GroupFilter;
                    var filters = [];
                    if (PV.isArray(groupFilter)) {
                        filters = groupFilter;
                    } else {
                        filters.push(groupFilter);
                    }
                    for (var j = 0; j < filters.length; j++) {
                        groupFilter = filters[j];
                        if (PV.isString(groupFilter.Group) && PV.isString(groupFilter.Value) && groupFilter.Group === groupName) {
                            values.push(groupFilter.Value);
                        }
                    }
                }
            }
        }
        if (values.length > 0) {
            return values;
        } else {
            return null;
        }
    },

    getPVStatus: function(response) {
        var PVStatus = null;

        if (response) {
            PVStatus = response.PVResponse.PVStatus;
        }

        return PVStatus;
    },
    getResultCode: function(response) {
        var code = null;

        if (response) {
            var PVStatus = this.getPVStatus(response);
            if (PVStatus) {
                code = PVStatus.Code;
            }
        }

        return code;
    },
    getResultMessage: function(response) {
        var message = null;

        if (response) {
            var PVStatus = this.getPVStatus(response);
            if (PVStatus) {
                message = PVStatus.Message;
            }
        }

        return message;
    },
    getResultScriptMessage: function(response) {
        var message = null;

        if (response) {
            var PVStatus = this.getPVStatus(response);
            if (PVStatus && PV.isString(PVStatus.SCRIPT_ERROR_MSG)) {
                message = PVStatus.SCRIPT_ERROR_MSG;
            }
        }

        return message;
    },
    isResultOk: function(response) {
        var result = false;

        if (response) {
            var codeText = this.getResultCode(response);
            var message = this.getResultMessage(response);
            if (codeText === 'RPM_PE_STATUS_OK' && message === 'Okay') {
                result = true;
            }
        }
        return result;
    },
    isResultTruncated: function(response) {
        var result = false;

        if (response) {
            var codeText = this.getResultCode(response);
            if (codeText === 'RPM_PE_QUERY_RESULT_TRUNCATED') {
                result = true;
            }
        }
        return result;
    },
    isResultTooLarge: function(response) {
        var result = false;

        if (response) {
            var codeText = this.getResultCode(response);
            var messageText = this.getResultMessage(response);
            if (codeText === 'RPM_PE_QUERY_FAILED' && messageText === 'Error: Request Entity Too Large: head') {
                result = true;
            }
        }
        return result;
    },
    isBulkUpsertInProgress: function(response) {
        var result = false;

        if (response) {
            var codeText = this.getResultCode(response);
            if (codeText === 'RPM_PE_QUERY_RESULT_OK_UPSERT_IN_PROGRESS' ||
                codeText === 'RPM_PE_QUERY_RESULT_TRUNCATED_UPSERT_IN_PROGRESS') {
                result = true;
            }
        }
        return result;
    },
    listFiles: function(dir, conditionFunc) {
        var files = [];
        if (fs.existsSync(dir)) {
            var tempList = fs.readdirSync(dir);
            for (var i = 0; i < tempList.length; i++) {
                var filePath = path.join(dir, tempList[i]);
                if (fs.lstatSync(filePath).isDirectory()) {
                    var subList = this.listFiles(filePath, conditionFunc);
                    files = files.concat(subList);
                } else {
                    if (PV.isFunction(conditionFunc)) {
                        if (conditionFunc(filePath)) {
                            files.push(filePath);
                        }
                    } else {
                        files.push(filePath);
                    }
                }
            }
        }
        return files;
    }
};