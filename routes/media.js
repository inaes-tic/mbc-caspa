module.exports = function (app) {
    var exports = {};
    var     _ = require('underscore')
    , melted= require('../mlt/Melted')
    , utils = require('../utils')
    ,resumable = require('../node_modules/resumable.js/resumable');

    //var mlt = new melted({reconnect: true});

    var Media = require (__dirname + '/../models/Media.js')
    , mediaList = new Media.Collection();

    exports.mediaList = mediaList;

    setInterval (function () { 
        var mediaNames = _.map(mediaList.models, function (w) {return w.attributes.file;});
        console.log ('hello, mediaList: ', mediaList.models.length, mediaNames);},
                 1000);

    utils.openDB(function (item) {
        mediaList.add(item);
    }, function () {
        console.log ("deferring scraper launch");
        setTimeout(function () {
            utils.scrape_files (process.env.HOME + "/Downloads/Gardel", _addMedia);
        }, 300);
    });

    _({'add':'create'}).each(function (b, e) {
        mediaList.bind(e, function (model, col) {
            console.log("model " + e + "->" + b);
            _.each(col.sockets, function (socket) {
                socket.broadcast.emit(col.url  + ':' + b, model.toJSON());
            });
        });
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
        utils.db.collection('medias', function(err, collection) {
            collection.update({'_id': media._id}, media, {upsert: true}, function(err, result) {
                if (err) {
                    console.error(err, 'An error has occurred, trying to insert');
                } else {
                    //                if (mlt.addFile(media.file))
                    mediaList.add(media);
                    //                console.error(err, 'An error has occurred, trying to add to melted');
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
        utils.db.collection('medias', function(err, collection) {
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

    // app.get('/tpl/:id', routes.tpl);
    app.get('/media',          exports.findAll);
    app.get('/media/:id',      exports.findById);
    app.get('/media/play/:id', exports.playById);
    app.post('/media',         exports.addMedia);
    app.put('/media/:id',      exports.updateMedia);
    app.delete('/media/:id',   exports.deleteMedia);
    return exports;
};
