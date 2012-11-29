var vows = require('vows'),
    assert = require('assert'),
	Q = require("q");

var Melted = require('./Melted');

vows.describe('Melted').addBatch({
    'init': {
        topic: new(Melted),
        'is connected': function (mlt) {
			var result = mlt.connect();
			Q.when(result, function() {
	            assert.equal (mlt.connected, true);
			});
        },
        'has no pending messages': function (mlt) {
            assert.equal (mlt.pending.length, 0);
        },
        'has no errors': function (mlt) {
            assert.equal (mlt.errors.length, 0);
        }
    },
    'commands': {
        topic: new(Melted),
        'bad': function (mlt) {
            mlt.sendCommand("no_such_command in my town", "200 OK");
			setTimeout(function() {
	            assert.equal (mlt.errors.length, 1);
			}, 500);
        },
        'good': function (mlt) {
            mlt.sendCommand("load u0 /home/jmrunge/Downloads/Gardel/Mancha-De-Rolando-Antes.mp4", "200 OK");
            mlt.sendCommand("play u0", "200 OK");
			setTimeout(function() {
	            assert.equal (mlt.errors.length, 1);
			}, 500);
        }
    }/*,
    'can add': {
        topic: new(Melted),
        'add non exist fails': function (mlt) {
            mlt.addFile('/does/not/exists');
            assert.deepEqual (mlt.errors, []);
        },
        'add bad file fails': function (mlt) {
            mlt.addFile('./test.js');
            assert.deepEqual (mlt.errors, []);
        },
        'add valid file works': function (mlt) {
            mlt.addFile('./logo.jpg');
        }
    }*/
}).export(module); // Export the Suite

