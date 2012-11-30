var net = require('net'),
	Q = require('q');

function Melted(opts) {
    var self = this;

	this.server     = false;
	this.errors     = [];
	this.pending    = [];
	this.connected  = false;
	this.connecting = false;
	this.commands   = [];
	this.processing = false;

	Melted.prototype.connect = function() {
        console.log("MELTED: [connect] Invoked");

		self.connecting = true;

		var deferred = Q.defer();

		self.server = new net.createConnection(5250);
        self.server.setEncoding('ascii');

        /*
          Event: 'connect'#
          Emitted when a socket connection is successfully established. See connect().
        */
		self.server.on("connect", function() {
            console.log("MELTED: [connect] Connected to Melted Server" );
			deferred.resolve(expect("100 VTR Ready").then(function() {
                self.connected = true;
				self.connecting = false;
				processQueue();
			}));
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
                console.error ("MELTED: [connect] Got 'end' but still data pending");
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
            console.log("MELTED: [connect] Could not connect to Melted Server: " + err);
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

		return deferred.promise;
	};

	Melted.prototype.sendPromisedCommand = function(command, expected) {
	    console.log("MELTED: [sendPromisedCommand] Invoked for command: " + command + ", expected: " + expected);

	    var deferred = Q.defer();

	    var successFunction = function(response) {
	        deferred.resolve(response);
	    };

	    var errorFunction = function(error) {
	        deferred.reject(error);
	    }

	    addCommandToQueue(command, expected, successFunction, errorFunction);

	    if (!self.connected) {
			if (!self.connecting) {
				self.connect();
			}
		} else if (!self.processing) {
			processQueue();
		}

		return deferred.promise;
	};

	Melted.prototype.sendCommand = function(command, expected, onSuccess, onError) {
		console.log("MELTED: [sendCommand] Invoked for command: " + command + ", expected: " + expected);

		addCommandToQueue(command, expected, onSuccess, onError);

		if (!self.connected) {
			if (!self.connecting) {
				self.connect();
			}
		} else if (!self.processing) {
			processQueue();
		}
	};

	function addPendingData (data) {
        if (data.match(/[^\s]/)) {
            self.pending.push(data);
            console.warn("MELTED: [addPendingData] Got " + self.pending.length + " data pending.");
            console.warn("MELTED: [addPendingData] Data: " + data);
        }
    };

	function processQueue() {
		console.log("MELTED: [processQueue] Invoked");

		if (!self.processing)
			self.processing = true;

		var command = self.commands.shift();

		if (command !== undefined) {
		    var onSuccess = command[2];
		var onError = command[3];
			console.log("MELTED: [processQueue] Processing command: " + command[0]);
			var result = _sendCommand(command[0], command[1]);

			result.then(function() {
			    if (onSuccess !== undefined) {
			    console.log("MELTED: [processQueue] Calling success callback: " + onSuccess.name);
			    onSuccess(result);
			    }
				processQueue();
			}, function(error) {
				var err = new Error("MELTED: [processQueue] Error processing command: " + command[0] + " [" + error + "]");
				console.error(err);
				self.errors.push(err);
				processQueue();
				if (onError !== undefined) {
				    console.log("MELTED: [processQueue] Calling error callback: " + onError.name);
				onError(error);
				}
			});
		} else {
			console.log("MELTED: [processQueue] Nothing else to process");
			self.processing = false;
		}
	}

	function addCommandToQueue(command, expected, onSuccess, onError) {
		console.log("MELTED: [addCommandToQueue] Invoked for command: " + command + ", expected: " + expected);
		var com = [];
		com[0] = command;
		com[1] = expected;
	    com[2] = onSuccess;
	    com[3] = onError;
		self.commands.push(com);
	}

	function _sendCommand(command, expected) {
		console.log("MELTED: [_sendCommand] Sending command: " + command);

		var deferred = Q.defer();

		self.server.write(command + "\n");

		var aux = command.split("\ ");

		deferred.resolve(expect(expected, aux[0]));

		return deferred.promise;
	};

	function expect(expected, command, prefix) {
	    // Aca hay un hack medio feo por como manejan entre net y melted la comunicacion, para poder obtener respuestas de mas de una linea...
		console.log("MELTED: [expect] Invoked to expect: " + expected);

		var deferred = Q.defer();
		self.server.removeListener('data', addPendingData);
		self.server.once('data', function(data) {
			self.server.addListener('data', addPendingData);
			console.log("MELTED: [expect] Received: " + data);
            var resp = data.replace(/\r\n/g, "");
			console.log("MELTED: [expect] Formatted Response: " + resp);
			if (resp.length == 0) {
			    console.log("MELTED: [expect] Received empty string, retrying");
			    deferred.resolve(expect(expected, command, prefix));
			} else if (resp == "402 Argument missing") {
			    var pfx = prefix.replace(/\r\n/g, "");
			    if ((pfx.substring(0, 1) == "2") || (pfx == "100 VTR Ready"))
			    deferred.resolve(prefix);
			else
			    deferred.reject(prefix);
			} else {
			    if (prefix == undefined) {
			        if (resp.substring(0, expected.length) == expected) {
			            console.log("RESPONSE AS EXPECTED");
				    deferred.resolve(expect(expected, command, data));
				} else {
		                console.error("MELTED: [expect] Expected '" + expected + "' but got '" + resp + "' !");
					    deferred.resolve(expect(expected, command, data));
			    }
			    //HACK
			    self.server.write("get\n");
			} else {
			    deferred.resolve(expect(expected, command, prefix + data));
			}
			}
        });
		return deferred.promise;
	};

};

exports = module.exports = function(args) {
    var mlt = new Melted(args);
    return mlt;
}
