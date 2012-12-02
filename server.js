var express = require('express'),
    path    = require('path'),
    exec    = require('child_process').exec,
    io      = require('socket.io'),
    i18n    = require('i18n-abide'),
    _       = require('underscore'),
    exec    = require('child_process').exec;

var dirs = {
    pub    : path.join(__dirname, 'public'),
    views  : path.join(__dirname, 'views') ,
    styles : path.join(__dirname, 'styles'),
    models : path.join(__dirname, 'models'),
    vendor : path.join(__dirname, 'vendor'),
    uploads: path.join(__dirname, 'public/uploads/incoming')
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
var media    = require('./routes/media')(app);

console.log ('hohohoh', media, media.mediaList);

io = io.listen(app.listen(app.get('port'), function(){
  console.log("Express server listening on port %d in %s mode", app.get('port'), app.settings.env);
}));

io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
io.set('log level', app.get('io.loglevel'));
io.set('transports', [                     // enable all transports (optional if you want flashsocket)
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
]);

io.sockets.on('connection', function (socket) {
    media.mediaList.bindServer(socket);
    media.Universe.bindServer(socket);
    appModel.bindServer(socket);

    socket.on('disconnect', function () {
        media.mediaList.unbindServer(socket);
        media.Universe.unbindServer(socket);
        appModel.unbindServer(socket);
    });
    socket.on(media.mediaList.url + ':moved', function (move) {
        socket.broadcast.emit (media.mediaList.url + ':moved', move);
        media.mediaList.move(move.from, move.to);

    });
});


