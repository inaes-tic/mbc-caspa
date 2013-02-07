var db = require('mongoskin').db('localhost:27017/mediadb?auto_reconnect', {safe:true});
var mubsub = require ('mubsub');
var client = mubsub (db);
var schedchannel = client.channel('messages', { size: 10000000, max: 50000 });

schedchannel.subscribe ({}, function (sched) {
        console.log ("got message:", sched);
});

console.log ("listening on 'messages'");
