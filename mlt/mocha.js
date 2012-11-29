var assert = require("assert"),
	Q = require("q");

var Melted = require('./Melted');
var mlt = new Melted();

describe('connects', function(){
	before(function(done) {
		var result = mlt.connect();
		Q.when(result, function() {
			done();
		});
	})
	describe('#connected', function(){
		it('should return true', function(){
			assert.equal (mlt.connected, true);
		})
	})
	describe('#no pending messages', function(){
		it('should return 0', function(){
			assert.equal (mlt.pending.length, 0);
		})
	})
	describe('#no errors', function(){
		it('should return 0', function(){
			assert.equal (mlt.errors.length, 0);
		})
	})

})

describe('commands', function(){
	describe('#bad and good commands', function(){
		before(function(done) {
            mlt.sendCommand("no_such_command in my town", "200 OK");
            mlt.sendCommand("load u0 /home/jmrunge/Downloads/Gardel/Mancha-De-Rolando-Antes.mp4", "200 OK");
            mlt.sendCommand("play u0", "200 OK");
			setTimeout(function() {
	            done();
			}, 1000);
		})
		it('should return 1 because of first command', function(){
            assert.equal (mlt.errors.length, 1);
		})
	})
})

describe('queue', function() {
	describe('#add commands after queue processed', function(){
		before(function(done) {
            mlt.sendCommand("pause u0", "200 OK");
            mlt.sendCommand("play u0", "200 OK");
			setTimeout(function() {
	            done();
			}, 1000);
		})
		it('should return 1 because of previous test', function(){
            assert.equal (mlt.errors.length, 1);
		})
	})
})
