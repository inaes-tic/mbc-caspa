/*global require:true, describe:true, before:true, it:true, window:true, setTimeout:true*/

var conf = require('mbc-common').config.Caspa,
    phantom = require('phantom'),
    chai = require('chai'),
    expect = chai.expect;

chai.Assertion.includeStack = true;

describe('Simple app lookup', function () {
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
    var browser=null;

        before(function(done) {
            ph.createPage(function (tab) {
                browser = tab;
                done();
            });
        });


    describe('GET /', function() {
    it('should return title', function (done) {
        browser.open('http://localhost:3000/', function (status) {
            if(status !== 'success') {
                console.log('Unable to access the network');
                throw 'Unable to access the network';
            } else {
                browser.evaluate(function inBrowser() {
                    return document.getElementsByTagName('title')[0].textContent;
                }, function fromBrowser(title) {
                    expect(title).to.equal(conf.Branding.name);
                    done();
                });
            }

        });
    });
    });


    describe('GET /#media/edit', function() {
    it('should exist create playlist buttom', function (done) {
        browser.open('http://localhost:3000/#media/edit', function (status) {
            if(status !== 'success') {
                console.log('Unable to access the network');
                throw 'Unable to access the network';
                done();
            }
        });

        // XXX: it may take a while to (re) render the page...
        setTimeout(function() {
            browser.evaluate(function inBrowser() {
              //document.getElementById('create-playlist')
                return $('.no-playlist-alert').length != 0;
            }, function fromBrowser(alert) {
                expect(alert).equal(true);
                done();
            });
        }, 1000);


    });
    });
});
});

