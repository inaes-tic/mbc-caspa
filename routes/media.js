module.exports = function (app) {
    var exports = {};
    var     _ = require('underscore')
    , melted= require('melted-node')
    , utils = require('../utils')
    ,resumable = require('resumable.js')(__dirname + '/../public/uploads/incoming');

    //var mlt = new melted({reconnect: true});

    var Media = require (__dirname + '/../models/Media.js');

    exports.collectionsToBind = {
        mediaList: new Media.Collection(),
        Universe : new Media.Universe(),
        Schedule : new Media.Schedule(),
    };

    var mediaList = exports.collectionsToBind.mediaList;

    setInterval (function () {
        for (col in exports.collectionsToBind) {
            var c = exports.collectionsToBind[col];
            console.log ('hello, ' + col + ' : ', c.models.length, 
                         _.zip(c.pluck('file'), c.pluck('name'), c.pluck('_id')));
        }
    }, 5000);

    utils.openDB(_addMedia, function () {
        console.log ("deferring scraper launch");
        setTimeout(function () {
            utils.scrape_files (process.env.HOME + "/Downloads/Gardel", _addMedia);
        }, 300);
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
        _addMedia(media)
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

    // Handle uploads through Resumable.js
    app.post('/media/upload', function(req, res){

	// console.log(req);

        resumable.post(req, function(status, filename, original_filename, identifier){
            console.log('POST', status, original_filename, identifier);

            if (status == 'done') {
                setTimeout(function () {
                    utils.merge (original_filename, _addMedia);
                }, 100);
            }

            res.send(status, {
                // NOTE: Uncomment this funciton to enable cross-domain request.
                //'Access-Control-Allow-Origin': '*'
            });
        });
    });

    // Handle cross-domain requests
    // NOTE: Uncomment this funciton to enable cross-domain request.
    /*
      app.options('/upload', function(req, res){
      console.log('OPTIONS');
      res.send(true, {
      'Access-Control-Allow-Origin': '*'
      }, 200);
      });
    */

    // Handle status checks on chunks through Resumable.js
    app.get('/media/upload', function(req, res){
        resumable.get(req, function(status, filename, original_filename, identifier){
            console.log('GET', status);
            res.send(status, (status == 'found' ? 200 : 404));
        });
    });

    app.get('/media/download/:identifier', function(req, res){
	resumable.write(req.params.identifier, res);
    });

    return exports;
};
