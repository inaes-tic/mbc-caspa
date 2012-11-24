// Save a reference to the global object (`window` in the browser, `global`
// on the server).
var root = this;

// The top-level namespace. All public Backbone classes and modules will
// be attached to this. Exported for both CommonJS and the browser.
var App, server = false;
if (typeof exports !== 'undefined') {
    App = exports;
    server = true;
} else {
    App = root.App = {};
}

// Require Underscore, Backbone & BackboneIO, if we're on the server, and it's not already present.
var _ = root._;
if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

var BackboneIO = root.BackboneIO;
if (!BackboneIO && (typeof require !== 'undefined')) BackboneIO = require('backboneio');

App.Model = BackboneIO.Model.extend({
    urlRoot: 'app',
    defaults: {
        title: 'MBC Playout {mlt edition}', 
        subtitle: 'A simple Playout server built with magic and love',
        state: 0,
        state_name: ['UNKNOWN', 'SYNCING', 'LOADING', 'PREROLL', 'PAUSED', 'PLAYING', 'REMOVED'],
        config: {
            scrape_path: "/home/xaiki/Downloads",
        },
        error: {
            melted: [],
        },
    },
});

if(server) module.exports = App;
else root.App = App;
