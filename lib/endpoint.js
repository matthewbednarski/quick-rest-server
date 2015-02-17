var restify = require('restify');
var Q = require('q');
var _ = require('lodash');
var uuid = require('node-uuid');
var moment = require('moment');
var save = require('save');
var filedb = require('./filedb.js');

var out = {};
out.setup = function(endpoint, keyField, file) {
    if (endpoint === undefined) {
        endpoint = "item";
    }
    if (keyField === undefined) {
        keyField = key;
    }
    if (file === undefined) {
        out.file = ".restify_" + endpoint + "_db.json";
    }else {
    	out.file = file;
	}
    out.server = restify.createServer();
    var server = out.server;
    server
        .use(restify.fullResponse())
        .use(restify.bodyParser({
            mapParams: true
        }));
    var itemSave = save(endpoint);

    var saveData = function() {
        var defer = Q.defer();
        itemSave.find({}, function(e, items) {
            if (e) {
                defer.reject(new Error(e));
            }
            if (items) {
                var outs = _.chain(items)
                    .sortBy(keyField)
                    .value();
                filedb.writeData(outs, file).done(defer.resolve);
            } else {
                defer.reject(new Error("Nothing to"));
            }
        })
    };

    out.parseData = function(data) {
        var defer = Q.defer();
        var oData = JSON.parse(data);
        if (oData === undefined) {
            defer.reject(new Error(data));
        }
        var objs = _.chain(oData)
            .value();
        var promises = [];
        _.forEach(objs, function(obj) {
            var d = Q.defer();
            itemSave.create(
                obj, function(eU, itemU) {
                    if (eU) {
                        d.reject(new Error(eU));
                    }
                    if (itemU) {
                        d.resolve(itemU);
                    } else {
                        d.reject(new Error("Nothing to do..."));
                    }
                    promises.push(d.promise);
                });
        });
        Q.allSettled(promises).done(
            function(d) {
                defer.resolve(d);
            });
        return defer.promise;
    };

    server.pre(restify.pre.userAgentConnection());
    var getAll = "/" + endpoint;
    var getOne = "/" + endpoint + "/:" + keyField;
    var put = "/" + endpoint + "/:" + keyField;
    var post = "/" + endpoint;
    var del = "/" + endpoint + "/:" + keyField;

    server.get(getAll, function(req, res, next) {
        itemSave.find({}, function(e, items) {
            if (e) {
                return next(new restify.InvalidArgumentError(JSON.stringify(e.errors)));
            }
            if (items) {
                res.contentType = 'json';
                var outs = _.chain(items)
                    .sortBy("key")
                    .value();
                res.send(outs);
            } else {
                res.send(404);
            }
        });
    });
    server.get(getOne, function(req, res, next) {
        var s = {};
        s[keyField] = req.params[keyField];
        itemSave.findOne(s, function(e, item) {
            if (e) return next(new restify.InvalidArgumentError(JSON.stringify(e.errors)));
            console.log(item);
            if (item) {
                res.contentType = 'json';
                res.send(item);
            } else {
                res.send(404);
            }
        })
    });
    server.post(post, function(req, res, next) {
        var body = JSON.parse(req.body);
        if (body[keyField] === undefined) {
            console.log(body);
            return next(new restify.InvalidArgumentError("Field '" + keyField + "' must be specified"));
        }
        var b = {};
        b[keyField] = body[keyField];
        itemSave.findOne(b, function(e, item) {
            if (e) {
                if (e) return next(new restify.InvalidArgumentError(JSON.stringify(e.errors)));
            } else if (item) {
                return next(new restify.InvalidArgumentError("item exists already"));
            } else {
                var obj = _.cloneDeep(body);
                if (obj._id === undefined) {
                    obj._id = uuid.v4();
                }
                obj.date_created = moment();
                obj.date_modified = moment();
                itemSave.create(
                    obj, function(eU, itemU) {
                        if (eU) return next(new restify.InvalidArgumentError(JSON.stringify(eU.errors)));
                        if (itemU) {
                            res.contentType = 'json';
                            res.send(201, itemU);
                            saveData();
                        } else {
                            res.send(404);
                        }
                    });
            }
        });
    });

    server.put(put, function(req, res, next) {
        var body = JSON.parse(req.body);
        if (req.params[keyField] === undefined) {
            return next(new restify.InvalidArgumentError("Field '" + keyField + "' must be specifieds"));
        }
        var b = {};
        b[keyField] = req.params[keyField];
        itemSave.findOne(b, function(e, item) {
            if (e) {
                if (e) return next(new restify.InvalidArgumentError(JSON.stringify(e.errors)));
            } else if (item) {
                var obj = _.cloneDeep(body);
                if (obj[keyField] === undefined || obj[keyField] !== item[keyField]) {
                    obj[keyField] = item[keyField];
                }
                if (obj._id === undefined) {
                    obj._id = item._id;
                }
                if(obj.date_created === undefined){
                	obj.date_created = moment();
				}
                obj.date_modified = moment();
                itemSave.update(
                    obj, true, function(eU, itemU) {
                        if (eU) return next(new restify.InvalidArgumentError(JSON.stringify(eU.errors)));
                        if (itemU) {
                            res.contentType = 'json';
                            res.send(itemU);
                            saveData();
                        } else {
                            res.send(404);
                        }
                    });
            } else {
                var obj = _.cloneDeep(body);
                if (obj._id === undefined) {
                    obj._id = uuid.v4();
                }
                obj.date_created = moment();
                obj.date_modified = moment();
                itemSave.create(
                    obj, function(eU, itemU) {
                        if (eU) return next(new restify.InvalidArgumentError(JSON.stringify(eU.errors)));
                        if (itemU) {
                            res.contentType = 'json';
                            res.send(201, itemU);
                            saveData();
                        } else {
                            res.send(404);
                        }
                    });
            }
        })
    });

    server.del(del, function(req, res, next) {
        if (req.params[keyField] === undefined) {
            return next(new restify.InvalidArgumentError('Field "' + keyField + '" must be specified'));
        }
        var b = {};
        b[keyField] = req.params[keyField];
        itemSave.findOne(b, function(e, item) {
            if (e) return next(new restify.InvalidArgumentError(JSON.stringify(e.errors)));
            if (item) {
                itemSave.delete(item._id, function(eD, itemD) {
                    if (eD) return next(new restify.InvalidArgumentError(JSON.stringify(eD.errors)));
                    res.send();
                    saveData();
                });
            } else {
                res.send(404);
            }
        });
    });
};
out.start = function( port ) {
	if( port === undefined ){
		port = 8002;
	}
	if(out.file === undefined){
		console.error("You must call the 'setup()' method on the 'endpoint' module!");
		return;
	}
    filedb.readIn(out.file)
        .then(out.parseData)
        .finally(function() {
            out.server.listen(port, function() {
                console.log(' % s listening at % s ', out.server.name, out.server.url);

            });
        });
};
module.exports = out;
