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
	this.maxIndex   = 0;
	this.currentIndex = 0;

	Melted.prototype.connect = function() {
        console.log("MELTED: [connect] Invoked");

		self.connecting = true;

		var deferred = Q.defer();

		self.server = new net.createConnection(5250);
        self.server.setEncoding('ascii');

		self.server.on("connect", function() {
			deferred.resolve(expect("100 VTR Ready"));
            console.log("MELTED: [connect] Connected to Melted Server" );
        });

		self.server.addListener('data', addPendingData);

		self.server.on('error', function(err) {
            console.log("MELTED: [connect] Could not connect to Melted Server: " + err);
        });

		return deferred.promise;
	};

	Melted.prototype.sendCommand = function(command, expected) {
		console.log("MELTED: [sendCommand] Invoked for command: " + command + ", expected: " + expected);

		addCommandToQueue(command, expected);

		if (!self.connected) {
			if (!self.connecting) {
				self.connect();
			}
		} else {
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
		console.log("MELTED: [processQueue] Invoked for index: " + self.currentIndex);
		if (self.currentIndex < (self.maxIndex + 1)) {

			var command = self.commands[self.currentIndex];

			var result = _sendCommand(command[0], command[1]);

			Q.when(result, function() {
				processNextItemInQueue();
			}, function(error) {
				console.error(error);
				self.errors.push(error);
				processNextItemInQueue();
			});
		}
	}

	function processNextItemInQueue() {
		self.currentIndex++;
		processQueue();
	}

	function addCommandToQueue(command, expected) {
		console.log("MELTED: [addCommandToQueue] Invoked for command: " + command + ", expected: " + expected + ", at index: " + self.maxIndex);
		var com = [];
		com[0] = command;
		com[1] = expected;
		self.commands[self.maxIndex] = com;
		self.maxIndex++;
	}

	function _sendCommand(command, expected) {
		console.log("MELTED: [_sendCommand] Sending command: " + command);

		var deferred = Q.defer();

		self.server.write(command + "\n");

		deferred.resolve(expect(expected));

		return deferred.promise;
	};

	function expect(expected) {
		console.log("MELTED: [expect] Invoked to expect: " + expected);

		var deferred = Q.defer();
		self.server.removeListener('data', addPendingData);
		self.server.once('data', function(data) {
			self.server.addListener('data', addPendingData);
            var err;
            var resp = data.replace(/\r\n/g, "");
			console.log("MELTED: [expect] Received: " + resp);
			if (resp.length == 0) {
				console.log("MELTED: [expect] Received empty string, retrying");
				deferred.resolve(expect(expected));
			} else {
		        if (resp !== expected) {
		            err = new Error ("MELTED: [expect] Expected '" + expected + "' but got '" + resp + "' !");
		            self.errors.push(err);
		            console.warn(err);
					deferred.reject(err);
		        } else {
					if (!self.connected) {
						self.connected = true;
						self.connecting = false;
						processQueue();
					}
					deferred.resolve("OK");
				}
			}
        });
		return deferred.promise;
	};

};

exports = module.exports = function(args) {
    var mlt = new Melted(args);
	//var result = mlt.connect();
    return mlt;
}
