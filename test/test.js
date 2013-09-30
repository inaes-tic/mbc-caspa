/*global require:true, describe:true, before:true, it:true, window:true, setTimeout:true*/

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

            it('should have nav links', function (done) {
                setTimeout(function() {
                    browser.evaluate(
                        function inBrowser() {
                            var nav_links = $("#nav [class*='menu'] a").map(function() { return ($(this).attr("href")); });
                            return nav_links.toArray();
                        },
                        function fromBrowser(nav_links) {
                            var urls = _.values(path);
                            expect(nav_links).to.eql(urls);
                            done();
                        }
                    );
                }, wait_time);
            });
        });

        describe('GET ' + path.media, function() {
            var url_media = host + path.media;
            open(url_media);
            it('should show total time right', function (done) {
                 setTimeout(function() {
                    browser.evaluate(
                        function inBrowser() {
                            var durations = $('[data-bind="text: durationraw"]').map(function() { return $(this).text(); });
                            var total_time = $('.total-time').text();
                            var calculated_time = prettyTime(arrayDuration(durations));
                            return { total_time: total_time, calculated_time: calculated_time };
                        },
                        function fromBrowser(duration) {
                            expect(duration.total_time).to.equal(duration.calculated_time);
                            done();
                        }
                    );
                }, wait_time);
            });
        });

        describe('GET ' + path.media_edit, function() {
            var url_media_edit = host + path.media_edit;
            open(url_media_edit);

            it('should exist create playlist buttom', function (done) {
                // XXX: it may take a while to (re) render the page...
                setTimeout(function() {
                    browser.evaluate(
                        function inBrowser() {
                            return $('.no-playlist-alert').length != 0;
                        },
                        function fromBrowser(alert) {
                            expect(alert).equal(true);
                            done();
                        }
                    );
                }, wait_time);
            });
        });
    });
});
