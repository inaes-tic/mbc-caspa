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
/*            ph.createPage(function (tab) {
                browser = tab;*/
                ph = res;
                server = require('../server.js');
                done();
//            });
        });
    });





    describe('Testing Server URLS', function() {
    var browser;

        beforeEach(function(done) {
            ph.createPage(function (tab) {
                browser = tab;
                done();
            });
        });
        afterEach(function(done) {
//            browser.close();
            done();
        });



    describe('GET /', function() {
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


    describe('GET /#media/edit', function() {
        before(function (done) {
            browser.open('http://localhost:3000/#media/edit', function (status) {
              console.log("1111111111111111111111111111111111111111111111111111111111111111111111111111111111");
                if(status !== 'success') {
                    console.log('Unable to access the network');
                } else {
                    console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeesdasdjnccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");
                    done();
                }
                });
        });

        it('should exist create playlist buttom', function (done) {
/*
            browser.open('http://localhost:3000/#media/edit', function (status) {
              console.log("1111111111111111111111111111111111111111111111111111111111111111111111111111111111");
                if(status !== 'success') {
                    console.log('Unable to access the network');
                } else {
                    console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeesdasdjnccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");

*/
            browser.evaluate(function inBrowser() {
              //document.getElementById('create-playlist')
                return document.getElementsByClassName('no-playlist-alert');
            }, function fromBrowser(alert) {
                expect(alert).not.equal("none");
                done();
            });
  /*
                     done();
                }
                });

    */


        });







    });



    });
});
