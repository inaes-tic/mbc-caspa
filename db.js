var db;
exports.db = function() {
    var conf = require('config').MediaDB;
    db = require('mongoskin').db(conf.dbHost + ':' + conf.dbPort + '/' + conf.dbName + '?auto_reconnect', {safe:true});
    return db;
}
