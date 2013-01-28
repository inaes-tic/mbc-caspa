module.exports = function (app) {
    var exports = {};
    var     _ = require('underscore')
    , melted= require('melted-node')
    , utils = require('../utils')
    ,resumable = require('resumable.js')(__dirname + '/../public/uploads/incoming');


    var i = 0;
/*
    utils.openDB(_addMedia, function () {
        console.log ("deferring scraper launch");
        setTimeout(function () {
//            utils.scrape_files (process.env.HOME + "/Downloads/Gardel", _addMedia);
        }, 300);
    });
*/
    // Handle uploads through Resumable.js
    app.post('/media/upload', function(req, res){

	// console.log(req);

        resumable.post(req, function(status, filename, original_filename, identifier){
            console.log('POST', status, original_filename, identifier);

            if (status == 'done') {
                setTimeout(function () {
                    utils.merge (original_filename, exports.addMedia);
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
