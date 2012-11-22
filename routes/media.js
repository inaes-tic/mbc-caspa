var mongo = require('mongodb')
     ,  _ = require('underscore')
     , fs = require ('fs')
     , fp = require('functionpool');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var Media = require (__dirname + '/../models/Media.js')
, mediaList = new Media.Collection();

var sc_pool = new fp.Pool({size: 1}, function (media, done) {
    var ffmpeg  = require('fluent-ffmpeg')
    , exists    = fs.existsSync || require('path').existsSync
    , dest      = './public/sc/' + media._id + '.jpg';
    console.log ('starting sc', media.file);

    if (exists('./public/sc/' + media._id)) {
        console.log ('skipping screenshot of: ' + md5 + '(file already there).');
        return done(media);
    }

    var proc = new ffmpeg({source: media.file})
        .withSize('150x100')
        .onCodecData(function(metadata) {
            console.log(metadata);
            metadata._id  = media._id;
            metadata.file = media.file;
            metadata.stat = media.stat;
            _addMedia (metadata);
        })
        .withFps(1)
        .addOption('-ss', '5')
        .onProgress(function(progress) {
            console.log(progress);
        })
        .saveToFile(dest, function(retcode, error) {
            if (! exists (dest) || error)
                return done (new Error('File not created' + error));

            console.log('sc ok: ' + media._id);
            return done(media);
        });
});

var parse_pool = new fp.Pool({size: 1}, function (file, stat, done) {
    var spawn = require('child_process').spawn,
    md5sum    = spawn('md5sum', [file]);

    db.collection('medias', function(err, collection) {
        collection.findOne({'file': file}, function(err, item) {
            if (!err && item) {
                if (stat === item.stat) return (done(item));
                else item.stat = stat;
            } else {
                item = {file: file, stat: stat};
            }

            md5sum.stdout.on('data', function (data) {
                item._id = data.toString().split(' ')[0];
                done(item);
            });
        });
    });
});

function scrape_files () {
  var walk      = require('walk')
    , spawn     = require('child_process').spawn
    , bs        = 10*1024*1024
    , observe   = process.env.HOME + "/Downloads";

    console.log ('launched obeserver on path: ' + observe);

    /* Ok, this a bit messy, it goes like this:
       + we get the file;
       + spawn a binary to calculate md5;
       + give that to the ffmpeg process that will:
         . extract codec data;
         . take a screenshot at 5s from start;
       + when all is done and good, we _addMedia, to get it into the medias objects;
    */

    //This listens for files found
    walk.walk(observe, { followLinks: false })
    .on('file', function (root, stat, next) {
        var file = root + '/' +  stat.name;
        next();
        if (! stat.name.match(/\.(webm|mp4|flv|avi|mpeg|mpeg2|mpg|mkv|ogm|ogg)$/i)) {
            return new Error('file not a vid');
        }

        parse_pool.task(file, stat, function (res, err) {
            if (err)
                return (console.error('error:', err));
            console.log ('parsed: ' + stat.name);
            sc_pool.task(res);
        });

    })
    .on('end', function () {
        console.log ("all done");
    });
}

exports.mediaList = mediaList;
/*
_({'change':'change', 'add':'create'}).each(function (b, e) {
    mediaList.bind(e, function (model, col) {
        console.log("model " + e + "->" + b, model);
        _.each(col.sockets, function (socket) {
            socket.emit(col.url  + ':' + b, model.toJSON());
            socket.broadcast.emit(col.url  + ':' + b, model.toJSON());
        });
    });
});
*/

function check_media (media, cb, arg) {
    var exists = fs.exists || require('path').exists;
    if (!arg)
        arg = media;

    exists (media.file, function (e) {
        if (!e)
            return;
        cb(arg)
        exists (__dirname + '/../public/sc/' + media._id + '.jpg', function (e) {
            if (!e)
                sc_pool.task (media, function (err, res) {
                    if (err)
                        console.error (new Error("couldn't sc"));
                });
            if (cb)
                cb(arg);
        });
    });
}

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
                        check_media (item, function (item) {
                            mediaList.add(item);
                        });
                    });
                });
            }
            setTimeout(scrape_files, 100);
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
    db.collection('medias', function(err, collection) {
        collection.update({'_id': media._id}, media, {upsert: true}, function(err, result) {
            if (err) {
                console.error(err, 'An error has occurred');
            } else {
                mediaList.add(media);
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
