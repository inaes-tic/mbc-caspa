var net = require('net');

function Melted(opts) {
    var self = this;

    this.server    = false;
    this.connected = false;
    this.pending   = [];
    this.errors    = [];

    Melted.prototype.addFile = function(file, callback) {
        var resp = self.sendCommand("uls")
        if (resp.toLowerCase().indexOf("u0") == -1) {
            self.sendCommand("uadd sdl")
            self.sendCommand("load u0 " + file)
            self.sendCommand("play u0")
        } else {
            self.sendCommand("apnd u0");
        }
        console.log("Response: " + resp);
    };

    Melted.prototype.connect = function(callback) {
        if (this.connected)
            return self;

        self.server = new net.createConnection(5250);
        self.server.setEncoding('ascii');
        /*
          Event: 'connect'#
          Emitted when a socket connection is successfully established. See connect().
        */

        self.server.on("connect", function() {
            expect("100 VTR Ready");
            self.connected = true;
            console.log("Connected to Melted Server" );
        });

        /*
          Event: 'data'#
          Buffer object
          Emitted when data is received. The argument data will be a Buffer
          or String. Encoding of data is set by socket.setEncoding(). (See
          the Readable Stream section for more information.)

          Note that the data will be lost if there is no listener when a
          Socket emits a 'data' event.
        */

        self.server.addListener('data', addPendingData);

        /*
          Event: 'end'#
          Emitted when the other end of the socket sends a FIN packet.

          By default (allowHalfOpen == false) the socket will destroy its
          file descriptor once it has written out its pending write queue.
          However, by setting allowHalfOpen == true the socket will not
          automatically end() its side allowing the user to write arbitrary
          amounts of data, with the caveat that the user is required to
          end() their side now.
        */

        self.server.on('end', function () {
            if (self.pending.length)
                console.error ("melted error: got 'end' but still data pending");
            self.connected = false;
        });

        /*
          Event: 'timeout'#
          Emitted if the socket times out from inactivity. Self is only to
          notify that the socket has been idle. The user must manually close
          the connection.
        */

        /*
          Event: 'drain'#
          Emitted when the write buffer becomes empty. Can be used to
          throttle uploads.
        */

        /*
          Event: 'error'#
          Error object
          Emitted when an error occurs. The 'close' event will be called
          directly following self event.
        */

        self.server.on('error', function(err) {
            console.log("Could not connect to Melted Server:" + err);
        });

        /*
          Event: 'close'#
          had_error Boolean true if the socket had a transmission error
          Emitted once the socket is fully closed. The argument had_error is
          a boolean which says if the socket was closed due to a
          transmission error.
        */

        self.server.on('close', function (had_error) {
            self.connected = false;
        });

        return self;
    };
    Melted.prototype.parseResponse = function(str) {
        console.log('parsing: ' + str);
        str = str.replace(/100 VTR Ready\r\n20. OK\r\n/g, "");
        switch (self.command) {
        case 'usta':
            //0 playing "colour:green" 13632 1000 25.00 0 14999 15000 "colour:green" 13632 0 14999 15000 1 2 0
            var split = str.split("\"");
            var JSONresponse = {};
            JSONresponse.status = split[0];
            JSONresponse.filename = split[1];
            var splits = split[2].split("\ ");
            JSONresponse.position = splits[1];
                            JSONresponse.speed = splits[2];
            JSONresponse.fps = splits[3];
            JSONresponse.inpoint = splits[4];
            JSONresponse.outpoint = splits[5];
            JSONresponse.length = splits[6];
            JSONresponse.b_filename = split[3];

            splits = split[4].split("\ ");
            JSONresponse.b_position = splits[1];
            JSONresponse.b_inpoint = splits[2];
            JSONresponse.b_outpoint = splits[3];
            JSONresponse.b_length = splits[4];
            JSONresponse.seekable = splits[5];
            JSONresponse.playlist_number = splits[6];
            JSONresponse.clip_index = splits[7].replace(/\r\n/g, "");
            return JSON.stringify(JSONresponse);
            break;
        case 'list':
            //"2\r\n0 \"colour:green\" 0 14999 15000 15000 25.00\r\n1 \"colour:red\" 0 14999 15000 15000 25.00\r\n\r\n"
            split = str.split("\r\n");
            JSONresponse = {};
            var len = (split.length - 2);
            for (var i = 1; i < len; i++) {
                JSONresponse.clips = {
                    "name": split[i]
                };
            }
            return JSON.stringify(JSONresponse);
            break;
        case "uls":
            split = str.split("\r\n");
                            JSONresponse = {};
            len = (split.length - 2);
            for (i = 1; i < len; i++) {
                JSONresponse.clips = {
                    "unit": split[i]
                };
            }
            return JSON.stringify(JSONresponse);
            break;
        default:
            return "UNHANDLED";
        }
    };
    Melted.prototype.sendCommand = function(command, callback) {
        var split = command.split(" ");
        self.command = split[0];
        if (!self.server) {
            self.connect();
        }
        console.log("Command: " + command);
        self.server.write(command + "\n");
        expect("200");
    };
    function addPendingData (data) {
        if (data.match(/[^\s]/)) {
            self.pending.push(data);
            console.warn('melted warn: got ' + self.pending.lenght + ' data pending.');
            console.warn('melted warn: "' + data + '"');
        }
    };
    function expect (str, resp) {
        self.server.removeListener('data', addPendingData);
        self.server.once('data', function (data) {
            self.server.addListener('data', addPendingData);
            var err;
            resp = data;
            if (! self.parseResponse(data) == str) {
                err = new Error ("expected '" + str + "' but got '" + data + "' !");
                self.errors.push(err);
                console.warn ("warning: " + err);
                return err;
            }
            return data;
        });
    };
};

exports = module.exports = function(args) {
    var mlt = new Melted(args);
    mlt.connect();
    return mlt;
}
