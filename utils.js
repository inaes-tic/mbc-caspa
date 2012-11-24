var fp    = require('functionpool')
,   fs    = require ('fs')
, ffmpeg  = require('fluent-ffmpeg');

exports.sc_pool = new fp.Pool({size: 1}, function (media, done) {
    var exists  = fs.existsSync || require('path').existsSync
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

exports.parse_pool = new fp.Pool({size: 1}, function (file, stat, done) {
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

exports.scrape_files = function () {
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

        exports.parse_pool.task(file, stat, function (res, err) {
            if (err)
                return (console.error('error:', err));
            console.log ('parsed: ' + stat.name);
            exports.sc_pool.task(res);
        });

    })
    .on('end', function () {
        console.log ("all done");
    });
}

exports.check_media = function (media, cb, arg) {
    var exists = fs.exists || require('path').exists;
    if (!arg)
        arg = media;

    exists (media.file, function (e) {
        if (!e)
            return;
        cb(arg)
        exists (__dirname + '/../public/sc/' + media._id + '.jpg', function (e) {
            if (!e)
                exports.sc_pool.task (media, function (err, res) {
                    if (err)
                        console.error (new Error("couldn't sc"));
                });
            if (cb)
                cb(arg);
        });
    });
}
