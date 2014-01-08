/* require all the libs we use */
var _              = require('underscore'),
    express        = require('express'),
    path           = require('path'),
    exec           = require('child_process').exec,
    i18n           = require('i18n-abide'),
    backboneio     = require('backbone.io'),
    moment         = require('moment'),
    uuid           = require('node-uuid'),
/* shared mbc code */
    mbc            = require('mbc-common'),
    conf           = mbc.config.Caspa,
    search_options = mbc.config.Search,
    collections    = mbc.config.Common.Collections,
    db             = mbc.db(),
    logger         = mbc.logger().addLogger('caspa_server'),
    App            = require("mbc-common/models/App"),
/* utilities */
    pubsub         = {publisher: mbc.pubsub(), listener: mbc.pubsub()},
    utils          = new (require('./utils'))(db),
    iobackends     = new (require('./iobackends'))(db, pubsub.publisher),
    auth           = new (require('./auth'))(iobackends)
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
    app.use(express.cookieSession({ secret: 'your secret here', cookie: { maxAge: conf.Others.maxage }}));
    app.use(require('less-middleware')({
        src:  conf.Dirs.styles,
        dest: conf.Dirs.pub,
        compress: true}
    ));

    app.use(auth.everyauth.middleware(app));
    app.use(function (req, res, next) {
        if (req.url.match ('^/css/.*') ||
            req.url.match ('^/img/.*') ||
            req.url.match ('/favicon.ico')) {
            return next();
        } else if(req.session.auth && req.session.auth.loggedIn){
            logger.warn ('logged in ', req.url, req.session.auth);
            return next();
        }

        logger.error ('not logged in', req.url);
        return res.redirect ('/login');
    });

    app.use(express.static(conf.Dirs.pub, {maxAge: conf.Others.maxage}));
    app.use('/models', express.static(conf.Dirs.models, {maxAge: conf.Others.maxage}));
    app.use('/lib',    express.static(conf.Dirs.vendor, {maxAge: conf.Others.maxage}));
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

var appModel = require('./routes')(app, auth.everyauth);
//var media = require('./routes/media')(app);

pubsub.listener.on('JSONmessage', function(chan, status) {

    if( chan != "mostoStatus" ) // we can ignore this message
        return;

    // This receives messages from mosto and propagates the message through
    //  backbone.io
    var emit = _.after(6, function() {
        logger.info('emitting', status);
        iobackends.emit('status', ['updated', status]);
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
pubsub.listener.subscribe('mostoStatus');

pubsub.listener.on('JSONmessage', function(chan, msg) {
    if( !(chan == 'mostoStatus.progress' ) )
        return;

    var status = new App.ProgressStatus(msg);
    iobackends.emit ('frame', ['updated', status]);
});

pubsub.listener.subscribe('mostoStatus.progress');

// there should probably be two backends or two collections or both, or something, one for
// one-time momentary messages like warnings and such to be dismissed by the frontend,
// and another one for "sticky" messages like long-lived status problems, like if melted died
// or the DB has a problem
pubsub.listener.on('JSONpmessage', function(pattern, chan, msg) {
    switch( chan ) {
        case "mostoMessage.emit":
            return iobackends.emit('mostomessages', ['created', msg.model]);
        case "mostoMessage.create":
            return iobackends.emit('mostomessages', ['created', msg.model]);
        case "mostoMessage.delete":
            return iobackends.emit('mostomessages', ['deleted', msg.model]);
    }
});
pubsub.listener.psubscribe('mostoMessage*');

var ios = iobackends.get_ios();
var server = app.listen(app.get('port'), function(){
    logger.info("Express server");
    logger.info("listening on port: " + app.get('port'));
    logger.info("--------- in mode: " + app.settings.env);
    logger.info("  active backends: " + _.keys(ios));
});
server.on ('error', function (err) {
    logger.error ('Fatal Error starting Express Server:', err.message);
    process.exit(1);
});
var io = backboneio.listen(server, ios);

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
                    iobackends.emit('media', ['created', model]);
                }
            });
        });
    }, 300);
} else {
    logger.info ("not scrapping");
}
