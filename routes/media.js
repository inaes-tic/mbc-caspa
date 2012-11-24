var mongo = require('mongodb')
  ,     _ = require('underscore')
  ,   mlt = require('../mlt/Melted').connect()
  , utils = require('../utils');
;

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var Media = require (__dirname + '/../models/Media.js')
, mediaList = new Media.Collection();

exports.mediaList = mediaList;

_({'add':'create'}).each(function (b, e) {
    mediaList.bind(e, function (model, col) {
        console.log("model " + e + "->" + b, model);
        _.each(col.sockets, function (socket) {
            socket.broadcast.emit(col.url  + ':' + b, model.toJSON());
        });
    });
});


var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('mediadb', server, {safe: true});

db.open(function(err, db) {
    if(!err) {
        console.log("Connected to 'mediadb' database");
        db.collection('medias', {safe:true}, function(err, collection) {
            if (err) {
                console.log("The 'medias' collection doesn't exist. Creating it with sample data...");
                populateDB();
            } else {
                collection.find().toArray(function(err, items) {
                    _(items).each (function (item) {
                        utils.check_media (item, function (item) {
                            mediaList.add(item);
                        });
                    });
                });
            }
            setTimeout(utils.scrape_files, 100);
        });
    } else {
        console.log("Could not connect:", err);
        abort();
    }
});

exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving media: ' + id);
    if (mediaList.get(id))
        res.send (mediaList.get(id));
};

exports.playById = function (req, res) {
    var id = req.params.id;
    var media = mediaList.get(id);
    if (media) {
        res.sendfile (media.get('file'));
    }
}

exports.findAll = function(req, res) {
    console.log('Retrieving all medias');
    res.send(mediaList.models);
};

function _addMedia (media, err) {
    console.log ("adding media " + media._id + " : " + media.file);
    db.collection('medias', function(err, collection) {
        collection.update({'_id': media._id}, media, {upsert: true}, function(err, result) {
            if (err) {
                console.error(err, 'An error has occurred, trying to insert');
            } else {
                if (mlt.addFile(media.file))
                    mediaList.add(media);
                console.error(err, 'An error has occurred, trying to add to melted');
            }
        });
    });

};

exports.addMedia = function(req, res) {
    var media = req.body;
    var err;
    console.log('Adding media: ' + JSON.stringify(media));
    mediaList.add(media)
    res.send(JSON.stringify(media));
    return;
}

// FIXME: TODO
exports.updateMedia = function(req, res) {
    var id = req.params.id;
    var media = req.body;
    delete media._id;
    console.log('Updating media: ' + id);
    console.log(JSON.stringify(media));
    db.collection('medias', function(err, collection) {
        collection.update({'_id':new BSON.ObjectID(id)}, media, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating media: ' + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(media);
            }
        });
    });
}

exports.deleteMedia = function(req, res) {
    var id = req.params.id;
    console.log('Deleting media: ' + id);
    mediaList.get(id).remove();
}

/*--------------------------------------------------------------------------------------------------------------------*/
// Populate database with sample data -- Only used once: the first time the application is started.
// You'd typically not find this code in a real-life app, since the database would already exist.
var populateDB = function() {
    /*
    setInterval(function () {_addMedia ({ file: 'test' + Date.now(), _id: Date.now()})},
                4*1000);

    return;
    */
}
