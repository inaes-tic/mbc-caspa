var express = require('express'),
    routes = require('./routes'),
    media = require('./routes/media'),
    tpl  = require('./routes/tpl'),
    path = require('path'),
    http = require('http'),
    io = require('socket.io');

var config = {
    public_dir : path.join(__dirname, 'public'),
    views_dir  : path.join(__dirname, 'views'),
};

var app = express();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', config.views_dir);
    app.set('view engine', 'jade');
    app.use(express.logger('dev'));
    app.use(express.bodyParser())
    app.use(express.methodOverride());
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());
    app.use(app.router);
    app.use(require('less-middleware')({ src: config.public_dir }));
    app.use(express.static(config.public_dir));
});

app.get('/', routes.index);
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
io.set('log level', 1);                    // reduce logging
io.set('transports', [                     // enable all transports (optional if you want flashsocket)
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
]);

io.sockets.on('connection', function (socket) {
  mediaList.bindServer(socket);
  socket.on('disconnect', function () {
    mediaList.unbindServer(socket);
  });
});


