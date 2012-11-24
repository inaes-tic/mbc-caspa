var vows = require('vows'),
    assert = require('assert');

var Melted = require('./Melted');

vows.describe('Melted').addBatch({
    'connects': {
        topic: new(Melted),
        'is connected': function (mlt) {
            assert.equal (mlt.connected, true);
        },
        'has no pending messages': function (mlt) {
            assert.deepEqual (mlt.pending, []);
        },
        'has no errors': function (mlt) {
            assert.deepEqual (mlt.errors, []);
        }
    },
    'commands': {
        topic: new(Melted),
        'bad': function (mlt) {
            mlt.sendCommand("no_such_command in my town");
            assert.deepEqual (mlt.errors, []);
        },
        'good': function (mlt) {
            mlt.sendCommand("uload u0 logo.jpg");
            mlt.sendCommand("play u0");
        }
    },
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
    }
}).export(module); // Export the Suite

