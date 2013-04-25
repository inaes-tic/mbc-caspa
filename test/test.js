/*global require:true, describe:true, before:true, it:true, window:true, setTimeout:true*/

var conf = require('mbc-common').config.Caspa,
    phantom = require('phantom'),
    chai = require('chai'),
    expect = chai.expect;

chai.Assertion.includeStack = true;

describe('Simple app lookup', function () {
    'use strict';

    var browser, server;

    before(function (done) {
        // get our browser and server up and running
        phantom.create(function (ph) {
            ph.createPage(function (tab) {
                browser = tab;
                server = require('../server.js');
                done();
            });
        });
    });

    it('should return title', function (done) {
        browser.open('http://localhost:3000/', function (status) {
            if(status !== 'success') {
                console.log('Unable to access the network');
            } else {
              setTimeout(function () {
                    browser.evaluate(function inBrowser() {
                        return document.getElementsByTagName('title')[0].textContent;
                    }, function fromBrowser(title) {
                        expect(title).to.equal(conf.Branding.name);
                        done();
                    });
              }, 1000); // give time for xhr to run
            }

        });
    });
});
