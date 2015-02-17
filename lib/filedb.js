var Q = require('q');
var fs = require('fs');

var readIn = function(dbFile) {
    var defer = Q.defer();
    fs.readFile(dbFile,
        function(err, data) {
            if (err) {
                defer.reject(new Error(err));
            }
            defer.resolve(data);
        });
    return defer.promise;
};
var writeData = function(obj, dbFile) {
    var defer = Q.defer();
    var sObj = JSON.stringify(obj);
    fs.writeFile(dbFile, sObj,
        function(err, succ) {
            if (err) {
                defer.reject(new Error(err));
            }
            defer.resolve("done");
        });
    return defer.promise;
};

var out = {};
out.readIn = readIn;
out.writeData = writeData;
module.exports = out;
