var net = require('net');

module.exports = exports = {
    server: false,
    response: false,
    command: false,
    addFile: function(file) {
        this.sendCommand("uls");
        if (this.response.toLowerCase().indexOf("u0") == -1) {
            this.sendCommand("uadd sdl");
            this.sendCommand("load u0 " + file);
            this.sendCommand("play u0");
        } else {
            this.sendCommand("apnd u0");
        }
        console.log("Response: " + this.response);
        return this.response;
    },
    connect: function() {
        this.server = new net.createConnection(5250);
        this.server.setEncoding('ascii');
        this.server.addListener("connect", function() {
            console.log("Connected to Melted Server" );
        });
        this.server.on('error', function(err) {
            console.log("Could not connect to Melted Server");
            console.log(err.toString());
        });
        this.server.on("data", this.bind(this, this.appendResponse));
        this.server.addListener("end", this.bind(this, this.parseResponse));
        return this;
    },
    parseResponse: function() {
        var str = this.response.toString();
        str = str.replace(/100 VTR Ready\r\n20. OK\r\n/g, "");
        switch (this.command) {
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
            str = JSON.stringify(JSONresponse);
            this.response = str;
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
            str = JSON.stringify(JSONresponse);
            this.response = str;
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
            str = JSON.stringify(JSONresponse);
            this.response = str;
            break;
        default:
            this.response = "OK";
        }
    },
    appendResponse: function(data) {
        this.response += data;
    },
    bind: function(scope, fn) {
        return function () {
                        fn.apply(scope, arguments);
        };
    },
    sendCommand: function(command) {
        var split = command.split(" ");
        this.command = split[0];
        if (!this.server) {
            this.connect();
        }
        this.response = "";
        console.log("Command: " + command);
        this.server.write(command + "\n");
    },
};
