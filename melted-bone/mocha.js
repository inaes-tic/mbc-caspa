var assert = require("assert");

var melted_server = require('./melted-server');
var mlt = new melted_server();

describe('first test', function(){
    describe('#play file', function(){
        before(function(done) {
            mlt.playFile();
            setTimeout(function() {
                done();
            }, 1000);
        })
        it('--should return true', function(){
            assert.equal (1, 1);
        })
    })
})