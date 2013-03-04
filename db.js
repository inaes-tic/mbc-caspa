var db;
exports.db = function() {
    db = require('mongoskin').db('localhost:27017/mediadb?auto_reconnect', {safe:true});
    return db;
}
