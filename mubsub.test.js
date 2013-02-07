var db = require('mongoskin').db('localhost:27017/mediadb?auto_reconnect', {safe:true});
var mubsub = require ('mubsub');
var client = mubsub (db);
var channel = client.channel('messages');

channel.subscribe ({}, function (sched) {
        console.log ("got message:", sched);
});

console.log ("listening on 'messages'");
