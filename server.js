var express = require('express'),
    path    = require('path'),
    exec    = require('child_process').exec,
    i18n    = require('i18n-abide'),
    _       = require('underscore'),
 backboneio = require('backbone.io'),
    conf    = require('config');


var dirs = {
    pub    : path.join(__dirname, 'public'),
    views  : path.join(__dirname, 'views') ,
    styles : path.join(__dirname, 'styles'),
    models : path.join(__dirname, 'models'),
    vendor : path.join(__dirname, 'vendor'),
    uploads: path.join(__dirname, 'public/uploads/incoming'),
    screenshots : path.join(__dirname, 'public/sc')
};

/* make sure at runtime that we atempt to get the dirs we need */
for (d in dirs) {
    /* HACK: but I'm not going to waist time writing mkdir -p */
    exec ('mkdir -p ' + dirs[d], function (error, stdout, stderr) {
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
    app.set('views', dirs.views);
    app.set('view engine', 'jade');
    app.use(express.logger('dev'));
/*    app.use('/uploads', upload({
        tmpDir:    dirs.uploads + '/incoming',
        uploadDir: dirs.upolads,
        uploadUrl: '/uploads/',
        safeFileTypes: /\.(webm|mkv|mov|mp4|avi|ogg)$/i,
    }));*/
    app.use(express.bodyParser({
            uploadDir: dirs.uploads,
            maxFieldsSize: 10 * 1024 * 1024
    })); /* */
    app.use(express.methodOverride());
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());
    app.use(app.router);
    app.use(require('less-middleware')({ 
        src:  dirs.styles,
        dest: dirs.pub,
        compress: true}
    ));
    app.use(express.static(dirs.pub));
    app.use('/models', express.static(dirs.models));
    app.use('/lib',    express.static(dirs.vendor));
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

var db = require('./db').db();

var mediabackend = backboneio.createBackend();
mediabackend.use(backboneio.middleware.mongoStore(db, 'medias'));

var blockbackend = backboneio.createBackend();
blockbackend.use(backboneio.middleware.memoryStore(db, 'blocks'));

var listbackend = backboneio.createBackend();
listbackend.use(backboneio.middleware.mongoStore (db, 'lists'));

var schedbackend = backboneio.createBackend();
schedbackend.use(backboneio.middleware.mongoStore(db, 'scheds'));

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

if (app.settings.env == "development") {
    setTimeout(function () {
        utils.scrape_files( path.join(__dirname, conf.Dirs.scrapeDir), function (model) {
            db.collection('medias').insert(model, {safe:true}, function(err, result) {
                if (err) {
                    console.error ('error','An error has occurred' + err);
                } else {
                    mediabackend.emit('created', model);
                }
            });
        });
    }, 300);
}
