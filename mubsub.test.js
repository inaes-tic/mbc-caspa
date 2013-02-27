var db = require('mongoskin').db('localhost:27017/mediadb?auto_reconnect', {safe:true});
var mubsub = require ('mubsub');
var client = mubsub (db);
var channel = client.channel('messages');

var App   = require ('./models/App');
var Media = require ('./models/Media');

var Status = new App.Status ();

function publish_model (channel, model) {
    channel.publish ({method: 'update', backend: model.backend, model: model.toJSON()});
}

channel.subscribe ({}, function (sched) {
        console.log ("got message:", sched);
});

Status.set ({
    piece: {
        previous: "014c761138a57e0b35694e37a44358ae",
        current:  "0bbe5a274cef3008ef05354134224cf5",
        next:     "73b9eb63aa2c3b9ecb7ce37f2cbdaf58",
    },
    show: {
        previous: "prevous show",
        current:  "current show",
        next:     "next show",
    },
    source: "this source",
    on_air: true,
});

publish_model (channel, Status);

/*
setTimeout (function () {
        AppModel.state++;
        console.log ('state now:', AppModel.state);
        publish_model (channel, AppModel);
}, 10000);
*/
console.log ("listening on 'messages'");
