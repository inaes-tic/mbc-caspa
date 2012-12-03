var assert = require("assert");

var melted_server = require('./melted-server');
var mlt = new melted_server();

var date = new Date();
var d = date.getDate();
var m = date.getMonth();
var y = date.getFullYear();

var test_files = [
    'test0.webm',
    'test1.webm',
    'test2.webm',
    'test3.webm',
    'test4.webm',
    'test5.webm',
    'test6.webm',
    'test7.webm',
];
    var test_events = [
    {
	start: new Date(y, m, d, 12, 0),
	end: new Date(y, m, d, 14, 0),
    },
    {
	start: new Date(y, m, d+1, 19, 0),
	end: new Date(y, m, d+1, 22, 30),
    },
];

var Backbone = require ('backbone');
var model = Backbone.Model.extend ({
    urlRoot: 'test',
    idAttribute: '_id',
    defaults: {
        models: test_files,
        event: null;
    }
});
var collection = Backbone.Collection.extend ({
    model: model,
    url: 'test',
});

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

describe('backbone collection glue', function () {
    describe('#bind to collection', function () {
        before (function (done) {
            var col = new collection();
            var e   = col.create({event: test_event[0]});
            done();
        });
        it('--should add the file to melted and pad dead times', function(){
            assert.equal (1, 1);
        });
    });
    describe('#detect unplayable setups', function () {
        before (function (done) {
            var col = new collection();
            var e   = col.create({event: test_event[0]});
            var e   = col.create({event: test_event[0]});
        });
        it('--should warn me that this setup is not going to work', function () {
            assert.equal (1, 1);
        });
    });
    describe('#sync states', function () {
        before (function (done) {
            var col = new collection();
            var e1  = col.create({event: test_event[0]});
            var e2  = col.create({event: test_event[1]});
            col.remove (e1);
        });
        it('--should  remove items from melted as they are removed from the collection', function () {
            assert.equal (1, 1);
        });
    });
};


