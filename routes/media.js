var mongo = require('mongodb');
var _ = require('underscore'); 

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var Media = require (__dirname + '/../models/Media.js')
, mediaList = new Media.Collection();

exports.mediaList = mediaList;

function createCallback (model) {
    console.log("model added");
}

mediaList.bind('change', function (model) {console.log("model changed")})
mediaList.bind('add', createCallback);

var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('mediadb', server, {safe: true});

db.open(function(err, db) {
    if(!err) {
        console.log("Connected to 'mediadb' database");
        db.collection('medias', {safe:true}, function(err, collection) {
            if (err) {
                console.log("The 'medias' collection doesn't exist. Creating it with sample data...");
                populateDB();
            }
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

exports.findAll = function(req, res) {
    console.log('Retrieving all medias');
    res.send(mediaList.models);
};

function _addMedia (media, err) {
    console.log ("adding media " + media._id + " : " + media.file);
    mediaList.add(media);
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

(function(){
    mediaList.add({ file: 'test1', _id: 'test1' });
    return;
    mediaList.add({ file: 'test2', _id: 'test2' });
    mediaList.add({ file: 'test3', _id: 'test3' });
    mediaList.add({ file: 'test4', _id: 'test4' });
    mediaList.add({ file: 'test5', _id: 'test5' });
    mediaList.add({ file: 'test6', _id: 'test6' });
    mediaList.add({ file: 'test7', _id: 'test7' });
    mediaList.add({ file: 'test8', _id: 'test8' });
})();

// FIXME: TODO
    return;
    var ffmpeg  = require('fluent-ffmpeg');
    var Metalib = ffmpeg.Metadata;
    //This sets up the file finder
    var finder = require('findit').find('/home/xaiki/Videos');

    var myPool = require('poolr').createPool(1);
    var fs = require ('fs');


    /* Ok, this a bit messy, it goes like this:
       + we get the file;
       + check it exists;
       + open it, calculate md5;
       + give that to the screenshooter;
       + pass it on to media analysis;
       + when all is done and good, we _addMedia, to get it into the medias objects;
    */
    function parse_file (file) {
        console.log('File: ' + file);
        // make sure you set the correct path to your video file

        var metaObject = new Metalib(file);
        fs.readFile(file, function (err, data) {
            var media = {_id : require('crypto')
                         .createHash('md5').update(data).digest('hex'),
                         file : file};
            if (mediaList.get(media._id))
                return console.log("id already in hash");

            var proc = new ffmpeg({source: file})
                .withSize('150x100')
                .onCodecData(function(metadata) {
                    console.log(codecinfo);
                    metadata._id  = media._id;
                    metadata.file = media.file;
                    _addMedia (metadata);
                })
                .takeScreenshots({
                    count: 1,
                    timemarks : [ '10%'],
                    filename : media._id}, './public/sc/', function (err, fn) {
                        console.log ("sc ok");
                    });
        });
        return "ok";
    }

    //This listens for files found
    finder.on('file', function (file) {
        myPool.addTask(parse_file, file, function(err, res) {
            if (err) return console.log(err);
        });
    });

    console.log ("all done");

    return;

    db.collection('medias', function(err, collection) {
        collection.insert(medias, {safe:true}, function(err, result) {});
    });

};
