var express = require('express'),
    path    = require('path'),
    exec    = require('child_process').exec,
    i18n    = require('i18n-abide'),
    _       = require('underscore'),
    backboneio = require('backbone.io'),
    mbc = require('mbc-common'),
    conf = mbc.config.Caspa,
    search_options = mbc.config.Search,
    collections = mbc.config.Common.Collections,
    moment = require('moment'),
    App = require("mbc-common/models/App"),
    maxage = 365 * 24 * 60 * 60 * 1000,
    uuid = require('node-uuid'),
    logger = mbc.logger().addLogger('caspa_server'),
    db = mbc.db(),
    utils = new (require('./utils'))(db)
 ;

var loggerStream = {
    write: function(message, encoding) {
        logger.info(message);
    }
};

/* make sure at runtime that we atempt to get the dirs we need */
for (d in conf.Dirs) {
    /* HACK: but I'm not going to waist time writing mkdir -p */
    exec ('mkdir -p ' + conf.Dirs[d], function (error, stdout, stderr) {
        if (error !== null) {
            logger.error('exec error: ' + error);
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
    app.use(express.logger({ stream: loggerStream, format: 'dev' }));
    app.use(express.compress());
/*    app.use('/uploads', upload({
        tmpDir:    conf.Dirs.uploads + '/incoming',
        uploadDir: conf.Dirs.upolads,
        uploadUrl: '/uploads/',
        safeFileTypes: /\.(webm|mkv|mov|mp4|avi|ogg)$/i,
    }));*/
    app.use(express.bodyParser({
            uploadDir: conf.Dirs.uploads,
            maxFieldsSize: 10 * 1024 * 1024
    }));
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.cookieSession({ secret: 'your secret here', cookie: { maxAge: maxage }}));
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

// Override mongoStore read method with custom
var searchWrapper = require('./searchWrapper.js');

function debug_middleware (req, res, next) {
    logger.debug('Backend: ', req.backend);
    logger.debug('Method: ', req.method);
    logger.debug('Channel: ', req.channel);
    logger.debug('Options: ', JSON.stringify(req.options));
    logger.debug('Model: ', JSON.stringify(req.model));
    next();
}

function id_middleware(req, res, next) {
    if( req.method == 'create' && req.model._id === undefined) {
        req.model._id = uuid.v1();
    }
    next();
}

function publishJSON_middleware (req, res, next) {
    publisher.publishJSON([req.backend, req.method].join('.'), { model: req.model });
    next();
};

var publisher = mbc.pubsub();
var listener = mbc.pubsub();

var backends = {
    app: {
        use: [backboneio.middleware.configStore()]
    },
    transform: {
        use: [id_middleware],
        mongo: {
            db: db,
            collection: collections.Transforms,
            opts: { search: search_options.Transforms },
        }},
    media: {
        mongo: {
            db: db,
            collection: collections.Medias,
            opts: { search: search_options.Medias },
        }},
    piece: {
        use: [id_middleware],
        mongo: {
            db: db,
            collection: collections.Pieces,
            opts: { search: search_options.Pieces },
        }},
    list: {
        use: [id_middleware],
        mongo: {
            db: db,
            collection: collections.Lists,
            opts: { search: search_options.Lists },
        }},
    sched: {
        use: [id_middleware, publishJSON_middleware],
        mongo: {
            db: db,
            collection: collections.Scheds,
            opts: { search: search_options.Scheds },
        }},
    status: {
        use: [id_middleware],
        mongo: {
            db: db,
            collection: collections.Status,
            opts: { search: search_options.Status },
        }},
    frame: {
        use: [backboneio.middleware.memoryStore(db, 'progress', {})],
    },
    mostomessages: {
        mongo: {
            db: db,
            collection: collections.Mostomessages,
            opts: { search: search_options.Mostomessages },
        }},
    sketch: {
        use: [id_middleware],
        mongo: {
            db: db,
            collection: collections.Sketchs,
            opts: { search: search_options.Sketchs },
        }},
};

/* process the backends object to streamline code */
_(backends).each (function (backend) {
    backend.io = backboneio.createBackend();
    if (backend.use)
        _(backend.use).each (function (usefn) {
            backend.io.use(usefn);
        });
    if (backend.mongo) {
        var mongo = _.extend ({db: db, opts: {}}, backend.mongo);
        var fn = _.identity;
        if (_.has(backend.mongo.opts, 'search'))
            fn = searchWrapper;
        backend.io.use(
            fn(backboneio.middleware.mongoStore(mongo.db,
                                             mongo.collection,
                                             mongo.opts)));
    }
    backend.io.use (debug_middleware);
    logger.info("Debugging backend: ", backend);
});

listener.on('JSONmessage', function(chan, status) {

    if( chan != "mostoStatus" ) // we can ignore this message
        return;

    // This receives messages from mosto and propagates the message through
    //  backbone.io
    var emit = _.after(6, function() {
        logger.info('emitting', status);
        backends['status'].io.emit('updated', status)
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
                logger.error(err);
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

listener.on('JSONmessage', function(chan, msg) {
    if( !(chan == 'mostoStatus.progress' ) )
        return;

    var status = new App.ProgressStatus(msg);
    backends['frame'].io.emit('updated', status);
});
listener.subscribe('mostoStatus.progress');

// there should probably be two backends or two collections or both, or something, one for
// one-time momentary messages like warnings and such to be dismissed by the frontend,
// and another one for "sticky" messages like long-lived status problems, like if melted died
// or the DB has a problem
listener.on('JSONpmessage', function(pattern, chan, msg) {
    switch( chan ) {
        case "mostoMessage.emit":
            return backends['mostomessages'].io.emit('created', msg.model);
        case "mostoMessage.create":
            return backends['mostomessages'].io.emit('created', msg.model);
        case "mostoMessage.delete":
            return backends['mostomessages'].io.emit('deleted', msg.model);
    }
});
listener.psubscribe('mostoMessage*');

var iobackends = {};
_(_.keys(backends)).each (function (backend) {
    iobackends[backend + 'backend'] = backends[backend].io;
});

var io = backboneio.listen(app.listen(app.get('port'), function(){
    logger.info("Express server listening on port " + app.get('port') + " in mode " + app.settings.env + '\nactive backends: ' +  _.keys(iobackends));
}), iobackends);

io.configure('production', function(){
    // send minified client
    io.enable('browser client minification');
    // apply etag caching logic based on version number
    io.enable('browser client etag');
    // gzip the file
    io.enable('browser client gzip');
});

if (process.env.HEROKU) {
    io.configure(function () {
        io.set("transports", ["xhr-polling"]);
        io.set("polling duration", 10);
    });
}

io.set('logger', logger); // Log socket.io with custom logger

if (process.env.MBC_SCRAPE) {
    setTimeout(function () {
        utils.scrape_files (conf.Dirs.scrape, function (model) {
            db.collection(collections.Medias).insert(model, {safe:true}, function(err, result) {
                if (err) {
                    logger.error('error','An error has occurred' + err);
                } else {
                    backends['media'].io.emit('created', model);
                }
            });
        });
    }, 300);
} else {
    logger.info ("not scrapping");
}
