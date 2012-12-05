// Save a reference to the global object (`window` in the browser, `global`
// on the server).
var root = this;

// The top-level namespace. All public Backbone classes and modules will
// be attached to this. Exported for both CommonJS and the browser.
var server = false;
if (typeof exports !== 'undefined') {
    server = true;
}

// Require Underscore, Backbone & BackboneIO, if we're on the server, and it's not already present.
var _ = root._;
if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

var BackboneIO = root.BackboneIO;
var Backbone   = root.Backbone;
if (!BackboneIO && server) BackboneIO = require('backboneio');
if (!Backbone   && server) Backbone   = require('backbone');

if (! Backbone || ! BackboneIO) {
    console.error ("Couldn't load required modules");
    abort();
}

BackboneIO.Collection.prototype.move = function (from, to) {
    console.log ('moving', from, to, this);
    if (! this.models[from] || ! this.models[to])
        return;

    var model = this.models[from].set_index(to, {silent: true});

    if (from < to) {
        for (var i = from; i < to; i++) {
            this.models[i] = this.models[i+1];
            this.models[i].set_index(i, {silent: true});
        }
    } else {
        for (var i = from; i > to; i--) {
            this.models[i] = this.models[i-1];
            this.models[i].set_index(i, {silent: true});
        }
    }

    this.models[to] = model;
    this.trigger('change:reorder');
    return model;
};

if (server) {
    module.exports = BackboneIO
} else {
    root.BackboneIO = BackboneIO;

    Backbone.View.prototype.moveDOM = BackboneIO.View.prototype.moveDOM = function (id, from, to) {
    var jumper = $('#' + id) || conosole.trace ('ho noes');
        var dest = $('#' +this.collection.models[to].get_id());
        if (from < to) {
            jumper.insertAfter(dest);
        } else {
            jumper.insertBefore(dest);
        }
        return dest;
    };
}
