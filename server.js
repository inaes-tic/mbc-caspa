var express = require('express'),
    path    = require('path'),
    exec    = require('child_process').exec,
    i18n    = require('i18n-abide'),
    _       = require('underscore'),
    backboneio = require('backbone.io'),
    mbc = require('mbc-common'),
    conf = require('mbc-common').config.Caspa,
    search_options = require('mbc-common').config.Search,
    collections = require('mbc-common').config.Common.Collections,
    moment = require('moment'),
    App = require("mbc-common/models/App"),
    maxage = 365 * 24 * 60 * 60 * 1000
 ;

/* make sure at runtime that we atempt to get the dirs we need */
for (d in conf.Dirs) {
    /* HACK: but I'm not going to waist time writing mkdir -p */
    exec ('mkdir -p ' + conf.Dirs[d], function (error, stdout, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
        }
    });
}

var app = express();

app.configure(function () {
    app.use(i18n.abide({
        supported_languages: ['en-US', 'es', 'db-LB', 'it-CH'],
        default_lang: 'es',
        debug_lang: 'it-CH',
        translation_directory: 'locale'
    }));
    app.set('port', process.env.PORT || 3000);
    app.set('views', conf.Dirs.views);
    app.set('view engine', 'jade');
    app.use(express.logger('dev'));
    app.use(express.compress('production'));
/*    app.use('/uploads', upload({
        tmpDir:    conf.Dirs.uploads + '/incoming',
        uploadDir: conf.Dirs.upolads,
        uploadUrl: '/uploads/',
        safeFileTypes: /\.(webm|mkv|mov|mp4|avi|ogg)$/i,
    }));*/
    app.use(express.bodyParser({
            uploadDir: conf.Dirs.uploads,
            maxFieldsSize: 10 * 1024 * 1024
    })); /* */
    app.use(express.methodOverride());
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());
    app.use(require('less-middleware')({
        src:  conf.Dirs.styles,
        dest: conf.Dirs.pub,
        compress: true}
    ));
    app.use(express.static(conf.Dirs.pub, {maxAge: maxage}));
    app.use('/models', express.static(conf.Dirs.models, {maxAge: maxage}));
    app.use('/lib',    express.static(conf.Dirs.vendor, {maxAge: maxage}));
    app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.set('io.loglevel', 100);
  app.set('minify', false);
});

app.configure('production', function(){
  app.use(express.errorHandler());
  app.set('io.loglevel', 1);
  app.set('minify', true);
});

var appModel = require('./routes')(app);
//var media = require('./routes/media')(app);

function debug_backend (backend) {
        console.log ('Debugging backend: ', backend);
        backend.use(function(req, res, next) {
                console.log(req.backend);
                console.log(req.method);
                console.log(JSON.stringify(req.model));
                next();
        });
}

var db = mbc.db();

var publisher = mbc.pubsub();
var listener = mbc.pubsub();

// Override mongoStore read method with custom
var searchWrapper = require('./searchWrapper.js');

var mediabackend = backboneio.createBackend();
mediabackend.use(searchWrapper(backboneio.middleware.mongoStore(db, collections.Medias, { search: search_options.Medias })));

var piecebackend = backboneio.createBackend();
piecebackend.use(searchWrapper(backboneio.middleware.mongoStore(db, collections.Pieces, { search: search_options.Pieces })));

var transformbackend = backboneio.createBackend();
transformbackend.use(searchWrapper(backboneio.middleware.mongoStore(db, collections.Transforms, { search: search_options.Transforms })));

var listbackend = backboneio.createBackend();
listbackend.use(searchWrapper(backboneio.middleware.mongoStore (db, collections.Lists, { search: search_options.Lists })));

function id_middleware(req, res, next) {
    if( req.method == 'create' && req.model._id === undefined) {
        req.model._id = moment().valueOf().toString();
    }
    next();
}

var schedbackend = backboneio.createBackend();
schedbackend.use(id_middleware);
schedbackend.use(function (req, res, next) {
    console.log ("schedbackend handler", req);
    publisher.publishJSON([req.backend, req.method].join('.'), { model: req.model });
    next();
});
schedbackend.use(searchWrapper(backboneio.middleware.mongoStore(db, collections.Scheds, { search: search_options.Scheds })));

var statusbackend = backboneio.createBackend();
listener.on('JSONmessage', function(chan, status) {

    if( chan != "mostoStatus" ) // we can ignore this message
        return;

    // This receives messages from mosto and propagates the message through
    //  backbone.io
    var emit = _.after(6, function() {
        console.log('emitting', status);
        statusbackend.emit('updated', status)
    });
    ['previous', 'current', 'next'].forEach(function(pos) {
        db.collection(collections.Scheds).findEach({ _id: status.show[pos]._id }, function(err, res) {
            if( res ) {
                status.show[pos] = {
                    name: res.title,
                    _id: res._id,
                };
            }
            emit();
        });
        //db.collection('lists').findEach({ "models._id": status.piece[pos]._id }, function(err, res) {
        db.collection(collections.Pieces).findById(status.piece[pos]._id, function(err, piece) {
            if( err ) {
                // we still want to call emit() even if there was a DB error
                console.error(err);
            }

            if( piece ) {
                /*
                var piece = _.chain(res.models).filter(function(p) {
                    return p._id == status.piece[pos]._id;
                }).value();
                console.log("[mosto status] filtered pieces", piece)
                if( !piece ) {
                    var message = "[mosto status] error: this shouldn't be empty";
                    console.log(message);
                    return new Error(message);
                }
                if( piece.length != 1 ) {
                    var message = "[mosto status] error: there must only be one!";
                    console.log(message)
                    return new Error(message);
                }

                piece = piece[0];
                */
                status.piece[pos] = piece;
                // default name to id
                if( !status.piece[pos].name ) {
                    var file = piece.file;
                    status.piece[pos].name = path.basename(file).replace(path.extname(file), '');
                }
            }
            emit();
        });
    });
});
listener.subscribe('mostoStatus');
statusbackend.use(backboneio.middleware.mongoStore(db, collections.Status, { search: search_options.Status }));

var framebackend = backboneio.createBackend();
listener.on('JSONmessage', function(chan, msg) {
    if( !(chan == 'mostoStatus.progress' ) )
        return;

    var status = new App.ProgressStatus(msg);
    framebackend.emit('updated', status);
});
listener.subscribe('mostoStatus.progress');
framebackend.use(backboneio.middleware.memoryStore(db, 'progress', {}));

var appbackend = backboneio.createBackend();
appbackend.use(backboneio.middleware.configStore());

// there should probably be two backends or two collections or both, or something, one for
// one-time momentary messages like warnings and such to be dismissed by the frontend,
// and another one for "sticky" messages like long-lived status problems, like if melted died
// or the DB has a problem
var mostomessagesbackend = backboneio.createBackend();
listener.on('JSONpmessage', function(pattern, chan, msg) {
    switch( chan ) {
        case "mostoMessage.emit":
            return mostomessagesbackend.emit('created', msg.model);
        case "mostoMessage.create":
            return mostomessagesbackend.emit('created', msg.model);
        case "mostoMessage.delete":
            return mostomessagesbackend.emit('deleted', msg.model);
    }
});
listener.psubscribe('mostoMessage*');
mostomessagesbackend.use(backboneio.middleware.mongoStore(db, collections.Mostomessages, { search: search_options.Mostomessages }));

_([mediabackend, listbackend, appbackend, piecebackend, transformbackend]).each (debug_backend);

var io = backboneio.listen(app.listen(app.get('port'), function(){
    console.log("Express server listening on port %d in %s mode", app.get('port'), app.settings.env);
}), { mediabackend: mediabackend,
      piecebackend: piecebackend,
      transformbackend: transformbackend,
      listbackend:  listbackend,
      schedbackend: schedbackend,
      statusbackend: statusbackend,
      framebackend: framebackend,
      appbackend: appbackend
    });

io.configure('production', function(){
    io.enable('browser client minification');  // send minified client
    io.enable('browser client etag');          // apply etag caching logic based on version number
    io.enable('browser client gzip');          // gzip the file
});

var utils = require('./utils');

if (process.env.MBC_SCRAPE) {
    setTimeout(function () {
        utils.scrape_files (conf.Dirs.scrape, function (model) {
            db.collection(collection.Medias).insert(model, {safe:true}, function(err, result) {
                if (err) {
                    console.error ('error','An error has occurred' + err);
                } else {
                    mediabackend.emit('created', model);
                }
            });
        });
    }, 300);
} else {
    console.log ("not scrapping");
}
