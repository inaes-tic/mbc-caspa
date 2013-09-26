/*global require:true, describe:true, before:true, it:true, window:true, setTimeout:true*/

process.env['LOG_LEVEL'] = 'error';

var mbc = require('mbc-common'),
    conf = mbc.config.Caspa,
    phantom = require('phantom'),
    chai = require('chai'),
    url = require('url'),
    _ = require('underscore'),
    logger = mbc.logger().addLogger('tests'),
    expect = chai.expect;

chai.Assertion.includeStack = true;

describe('Running Server', function () {
    'use strict';

    var server, ph;

    before(function (done) {
        // get our browser and server up and running
        phantom.create(function (res) {
            ph = res;
            server = require('../server.js');
            done();
        });
    });


    describe('Testing Server URLS', function() {
        var browser = null;
        var host = url.format({ protocol: 'http', hostname: 'localhost', port: 3000 });
        var path = { media: '/media', media_edit: '/media/edit', playout: '/playout', schedule: '/schedule', conf: '/admin' };
        var msg_network_problem = 'Unable to access the network';
        var wait_time = 1000;

        before(function(done) {
            ph.createPage(function (tab) {
                browser = tab;
                done();
            });
        });

        var open = function(url) {
            before(function(done) {
                browser.open(url, function (status) {
                    if(status !== 'success') {
                        logger.error(msg_network_problem);
                        throw msg_network_problem;
                    }
                    done();
                });
            });
        }

        describe('GET /', function() {
            var url_root = host;
            open(url_root);

            it('should return title', function (done) {
                browser.evaluate(
                    function inBrowser() {
                        var title = document.getElementsByTagName('title')[0].textContent;
                        return title;
                    },
                    function fromBrowser(title) {
                        expect(title).to.equal(conf.Branding.name);
                        done();
                    }
                );
            });
        });

    });
});
