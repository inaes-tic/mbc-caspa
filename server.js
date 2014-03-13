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
    common_conf    = mbc.config.Common,
    search_options = mbc.config.Search,
    collections    = common_conf.Collections,
    db             = mbc.db(),
    logger         = mbc.logger().addLogger('caspa_server'),
/* utilities */
    pubsub         = {publisher: mbc.pubsub(), listener: mbc.pubsub()},
    utils          = new (require('./utils'))(db),
    backends_conf  = require('./backends')(db),
    iobackends     = new mbc.iobackends(db, backends_conf),
    auth           = new (require('./auth'))(iobackends)
 ;

iobackends.patchBackbone();
/* from now on imported models have a working bindBackend() here too */
/* custom heartbeats require patched backbone to work properly. */
var App            = require("mbc-common/models/App");
var heartbeats     = require("mbc-common/heartbeats");
var phb = new heartbeats.PateroHeartBeat();

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
    app.use(express.cookieSession({ secret: 'your secret here', cookie: { maxAge: common_conf.Others.maxage }}));
    app.use(require('less-middleware')({
        src:  conf.Dirs.styles,
        dest: conf.Dirs.pub,
        compress: true}
    ));

    app.use(auth.everyauth.middleware(app));
    if (! process.env.CASPA_NOAUTH) {
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
    }

    app.use(express.static(conf.Dirs.pub, {maxAge: common_conf.Others.maxage}));
    app.use('/models', express.static(conf.Dirs.models, {maxAge: common_conf.Others.maxage}));
    app.use('/lib',    express.static(conf.Dirs.vendor, {maxAge: common_conf.Others.maxage}));
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
