var assert = require("assert"),
existsSync = require('fs').existsSync || require('path').existsSync;

var FFMPEG = require ('./ffmpeg');
var f = new FFMPEG ();

describe ('screenshots', function () {
    before(function (done) {
        f.run ('/home/xaiki/Downloads/AlaindeBotton_2009G-480p.mp4', 'blah.jpg',
               {onCodecData: function (arg) { console.log ('got codec data', arg);}},
               function (code, fds) { console.log ('finished', code); done()});
    })
    it('--should create a screenshot', function () {
        assert(existsSync ('blah.jpg'));
    })
});
