var express = require('express'),
    path    = require('path'),
    exec    = require('child_process').exec,
    i18n    = require('i18n-abide'),
    _       = require('underscore'),
    backboneio = require('backbone.io'),
    conf    = require('config'),
    mbc = require('mbc-common')
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
        locale_directory: 'locale'
    }));
    app.set('port', process.env.PORT || 3000);
    app.set('views', conf.Dirs.views);
    app.set('view engine', 'jade');
    app.use(express.logger('dev'));
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
    app.use(app.router);
    app.use(require('less-middleware')({ 
        src:  conf.Dirs.styles,
        dest: conf.Dirs.pub,
        compress: true}
    ));
    app.use(express.static(conf.Dirs.pub));
    app.use('/models', express.static(conf.Dirs.models));
    app.use('/lib',    express.static(conf.Dirs.vendor));
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
var media = require('./routes/media')(app);

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
var mubsub = require ('mubsub');
var client = mubsub (db);

var channel = client.channel('messages', { size: 10000000, max: 50000 });

var mediabackend = backboneio.createBackend();
mediabackend.use(backboneio.middleware.mongoStore(db, 'medias'));

var blockbackend = backboneio.createBackend();
blockbackend.use(backboneio.middleware.memoryStore(db, 'blocks'));

var listbackend = backboneio.createBackend();
listbackend.use(backboneio.middleware.mongoStore (db, 'lists'));

var schedbackend = backboneio.createBackend();
schedbackend.use(function (req, res, next) {
    console.log ("schedbackend handler", req);
    channel.publish ({channel: "schedbackend", method: req.method, backend: req.backend, model: req.model});
    next();
});
schedbackend.use(backboneio.middleware.mongoStore(db, 'scheds'));
channel.subscribe ({channel: 'schedbackend'}, function (sched) {
    schedbackend.emit('updated', sched.model);
});

_([mediabackend, listbackend]).each (debug_backend);

backboneio.listen(app.listen(app.get('port'), function(){
    console.log("Express server listening on port %d in %s mode", app.get('port'), app.settings.env);
}), { mediabackend: mediabackend,
      blockbackend: blockbackend,
      listbackend:  listbackend,
      schedbackend: schedbackend,
    });

var utils = require('./utils');

//var mlt = new melted({reconnect: true});

if (process.env.MBC_SCRAPE) {
    setTimeout(function () {
        utils.scrape_files (conf.Dirs.scrape, function (model) {
            db.collection('medias').insert(model, {safe:true}, function(err, result) {
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
