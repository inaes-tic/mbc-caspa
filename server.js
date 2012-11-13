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

var server = http.createServer(app);
io = io.listen(server);


io.configure(function () {
    io.set('authorization', function (handshakeData, callback) {
        if (handshakeData.xdomain) {
            callback('Cross-domain connections are not allowed');
        } else {
            callback(null, true);
        }
    });
});

server.listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});

app.get('/', routes.index);
// app.get('/tpl/:id', routes.tpl);
app.get('/media', media.findAll);
app.get('/media/:id', media.findById);
app.post('/media', media.addMedia);
app.put('/media/:id', media.updateMedia);
app.delete('/media/:id', media.deleteMedia);

io.sockets.on('connection', function (socket) {

    socket.on('message', function (message) {
        console.log("Got message: " + message);
        ip = socket.handshake.address.address;
        url = message;
        io.sockets.emit('pageview', { 'connections': Object.keys(io.connected).length, 'ip': '***.***.***.' + ip.substring(ip.lastIndexOf('.') + 1), 'url': url, 'xdomain': socket.handshake.xdomain, 'timestamp': new Date()});
    });

    socket.on('disconnect', function () {
        console.log("Socket disconnected");
        io.sockets.emit('pageview', { 'connections': Object.keys(io.connected).length});
    });

});
