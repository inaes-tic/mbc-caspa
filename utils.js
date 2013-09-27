var     _ = require('underscore')
,   fp    = require('functionpool')
, ffmpeg  = require('./ffmpeg/')
,   fs    = require ('fs')
,  mbc    = require('mbc-common')
, conf    = mbc.config.Caspa
, logger  = mbc.logger().addLogger('caspa_util')
;

var _exists     = fs.exists     || require('path').exists;
var _existsSync = fs.existsSync || require('path').existsSync;

var db = mbc.db();

exports.merge = function (original_filename, callback) {
    var i = 1;
    var path = require ('path');
    var source_base = path.join (conf.Dirs.uploads, '/resumable-' + original_filename + '.');

    dest = path.join (__dirname, '/public/uploads/', original_filename);
    if (_existsSync (dest))
        return;

    for (; _existsSync (source_base + i); i++)  {
        logger.debug('--->', source_base + i);

        var writter = fs.createWriteStream(dest, {'flags': 'a'});
        writter.write (fs.readFileSync (source_base +i));
    };

    var id = setInterval (function () {
        logger.info('about to call merge_finish');
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
    logger.debug('all good, pasing it to parse', exports.parse_pool);
    exports.parse_pool.task(dest, stat, function (res, err) {
        if (err)
            return (logger.error('error:', err));
        logger.debug('parsed: ' + stat.name);
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
    var dest = conf.Dirs.screenshots + '/' + media._id + '.jpg';
    logger.info('starting sc', media.file);
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
                logger.info('here');
                if (!callback)
                    return;

                logger.debug('metadata: ', metadata);
                metadata._id  = media._id;
                metadata.file = media.file;
                metadata.stat = media.stat;
                metadata.checksum = media._id;
                callback (metadata);
            }
    }, function(retcode, fds) {
        logger.info('here0 ');
        if (! _existsSync (dest) || retcode) {
            var error = new Error('File not created' + fds.err);
            logger.error('ERROR', error);
            return done (error);
        }

        logger.info('sc ok: ' + media._id);
        return done(media);
    });
});

exports.parse_pool = new fp.Pool({size: 1}, function (file, stat, done) {
    var spawn = require('child_process').spawn,
    md5sum    = spawn('md5sum', [file]);

    logger.info("looking at :" + file);
    md5sum.stdout.on('data', function (data) {
        var md5 = data.toString().split(' ')[0];

        db.collection('medias').findOne(md5, function(err, item) {
            if (!err && item) {
                if (stat === item.stat) return (done(item));
                else item.stat = stat;
            } else {
                item = { _id: md5 , file: file, stat: stat};
            }

            return done(item);
        });

    });
});


exports.scrape_files = function (path, callback) {
  var walk      = require('walk')
    , spawn     = require('child_process').spawn
    , bs        = 10*1024*1024
    , observe   = path;

    logger.info('launched obeserver on path: ' + observe);

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
        if (! stat.name.match(/\.(webm|mp4|flv|avi|mpeg|mpeg2|mpg|mov|mkv|ogm|ogg)$/i)) {
            return new Error('file not a vid');
        }

        exports.parse_pool.task(file, stat, function (res, err) {
            if (err)
                return (logger.error('error:', err));
            logger.debug('parsed: ' + stat.name, res);
            exports.sc_pool.task(res, callback, function (err, res) {return res});
        });

    })
    .on('end', function () {
        logger.info("all done");
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
        _exists (conf.Dirs.screenshots + '/' + media._id + '.jpg', function (e) {
            if (!e)
                exports.sc_pool.task (media, null, function (res, err) {
                    if (err) {
                        logger.error(new Error("couldn't sc"));
                    }
                });
        });
    });
}
