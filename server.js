var express = require('express'),
    path    = require('path'),
    http    = require('http'),
    io      = require('socket.io'),
    i18n    = require('i18n-abide');

var dirs = {
    pub    : path.join(__dirname, 'public'),
    views  : path.join(__dirname, 'views'),
    styles : path.join(__dirname, 'styles'),
    models : path.join(__dirname, 'models'),
    vendor : path.join(__dirname, 'vendor')
};

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
    app.use(express.bodyParser())
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

require('./routes')(app);
var media = require('./routes/media');

// app.get('/tpl/:id', routes.tpl);
app.get('/media', media.findAll);
app.get('/media/:id', media.findById);
app.post('/media', media.addMedia);
app.put('/media/:id', media.updateMedia);
app.delete('/media/:id', media.deleteMedia);

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
  socket.on('disconnect', function () {
    media.mediaList.unbindServer(socket);
  });
    socket.on('medias:swapped', function (move) {
        socket.broadcast.emit ('medias:swapped', move);
        media.mediaList.swap(move);

    });

});


