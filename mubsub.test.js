var db = require('mongoskin').db('localhost:27017/mediadb?auto_reconnect', {safe:true});
var mubsub = require ('mubsub');
var client = mubsub (db);
var channel = client.channel('messages');

channel.subscribe ({}, function (sched) {
        console.log ("got message:", sched);
});

channel.subscribe ({backend: 'appbackend'}, function (msg) {
    msg.model.state++;
    setTimeout (function () {
        console.log ('state now:', msg.model.state);
        channel.publish (msg);
    }, 10000);
});

console.log ("listening on 'messages'");
