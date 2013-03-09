var     _ = require('underscore')
,   fp    = require('functionpool')
, ffmpeg  = require('./ffmpeg/')
,   fs    = require ('fs');

var _exists     = fs.exists     || require('path').exists;
var _existsSync = fs.existsSync || require('path').existsSync;

var db = require('mongoskin').db('localhost:27017/mediadb?auto_reconnect', {safe:true});

exports.openDB = function (callback, populateCallback) {
    db.open(function(err, db) {
        if(!err) {
            console.log("Connected to 'mediadb' database");
            db.collection('medias', {safe:true}, function(err, collection) {
                if (err) {
                    console.log("The 'medias' collection doesn't exist. Creating it with sample data...");
                    if (populateCallback)
                        populateCallback()
                } else {
                    collection.find().toArray(function(err, items) {
                        _(items).each (function (item) {
                            exports.check_media (item, function (item) {
                                callback(item);
                            });
                        });
                    });
                }
            });
        } else {
            console.log("Could not connect:", err);
            abort();
        }
    });
}

exports.merge = function (original_filename, callback) {
    var i = 1;
    var path = require ('path');
    var source_base = path.join (__dirname, '/public/uploads/incoming', '/resumable-' + original_filename + '.');

    dest = path.join (__dirname, '/public/uploads/', original_filename);
    if (_existsSync (dest))
        return;

    for (; _existsSync (source_base + i); i++)  {
        console.log ('--->', source_base + i);

        var writter = fs.createWriteStream(dest, {'flags': 'a'});
        writter.write (fs.readFileSync (source_base +i));
    };

    var id = setInterval (function () {
        console.log ('about to call merge_finish');
        exports.merge_finish(dest, id, callback)
    }, 200);

    return dest;
}

/* all this hack, is because sometimes merge_finish was called before dest could be found
   this hopes to fix it */

exports.merge_finish = function (dest, id, callback) {
    if (! _existsSync (dest))
        return;

    clearInterval (id);

    var stat = fs.statSync (dest);
    console.log ('all good, pasing it to parse', exports.parse_pool);
    exports.parse_pool.task(dest, stat, function (res, err) {
        if (err)
            return (console.error('error:', err));
        console.log ('parsed: ' + stat.name);
        exports.sc_pool.task(res, callback, function (err, res) {return res});
    });
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

exports.sc_pool = new fp.Pool({size: 1}, function (media, callback, done) {
    var dest = './public/sc/' + media._id + '.jpg';
    console.log ('starting sc', media.file);
/*
    if (_existsSync('./public/sc/' + media._id)) {
        console.log ('skipping screenshot of: ' + md5 + '(file already there).');
        return done(media);
    }
*/
    var f = new ffmpeg();
    f.run (media.file, dest, {
            size: '150x100',
            onCodecData: function(metadata) {
                console.log ('here');
                if (!callback)
                    return;

                console.log(metadata);
                metadata._id  = media._id;
                metadata.file = media.file;
                metadata.stat = media.stat;
                callback (metadata);
            }
    }, function(retcode, fds) {
        console.log ('here0 ');
        if (! _existsSync (dest) || retcode) {
            var error = new Error('File not created' + fds.err);
            console.log ('ERROR', error);
            return done (error);
        }

        console.log('sc ok: ' + media._id);
        return done(media);
    });
});

exports.parse_pool = new fp.Pool({size: 1}, function (file, stat, done) {
    var spawn = require('child_process').spawn,
    md5sum    = spawn('md5sum', [file]);

    db.collection('medias').findOne({'file': file}, function(err, item) {
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


exports.scrape_files = function (path, callback) {
  var walk      = require('walk')
    , spawn     = require('child_process').spawn
    , bs        = 10*1024*1024
    , observe   = path;

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

        exports.parse_pool.task(file, stat, function (res, err) {
            if (err)
                return (console.error('error:', err));
            console.log ('parsed: ' + stat.name, res);
            exports.sc_pool.task(res, callback, function (err, res) {return res});
        });

    })
    .on('end', function () {
        console.log ("all done");
    });
}

exports.check_media = function (media, cb, arg) {
    if (!arg)
        arg = media;

    _exists (media.file, function (e) {
        if (!e)
            return;
        if (cb)
            cb(arg)
        _exists (__dirname + '/../public/sc/' + media._id + '.jpg', function (e) {
            if (!e)
                exports.sc_pool.task (media, null, function (res, err) {
                    if (err) {
                        console.error (new Error("couldn't sc"));
                    }
                });
        });
    });
}
