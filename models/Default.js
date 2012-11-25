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
if (!BackboneIO && (typeof require !== 'undefined')) BackboneIO = require('backboneio');

BackboneIO.Model.prototype.get_id = function (index) {
    return this.get(this.idAttribute || 'id');
};

BackboneIO.Model.prototype.index2Pos = function (index) {
    return index;
};

BackboneIO.Model.prototype.get_index = function () {
    return this.get('pos');
};

BackboneIO.Model.prototype.set_index = function (index) {
    this.set({pos: this.index2Pos(index)});
    return this;
};

BackboneIO.Collection.prototype.initialize = function () {
    this.bind('add', function (model) {
        model.set_index(this.size() - 1);
        model.save();
    });
};

BackboneIO.Collection.prototype.move = function (from, to) {
    var model = this.models[from].set_index(to);

    if (from < to) {
        for (var i = from; i < to; i++) {
            this.models[i] = this.models[i+1];
            this.models[i].set_index(i);
        }
    } else {
        for (var i = from; i > to; i--) {
            this.models[i] = this.models[i-1];
            this.models[i].set_index(i);
        }
    }

    this.models[to] = model;
    return model;
};

BackboneIO.Collection.prototype.comparator = function (model) {
    return model.get_index();
};

if (server) {
    module.exports = BackboneIO
    return;
}
root.BackboneIO = BackboneIO;

Backbone.View.prototype.moveDOM = BackboneIO.View.prototype.moveDOM = function (id, from, to) {
    var dest = $('#' +this.model.models[to].get_id());
    if (from < to) {
        $('#' + id).insertAfter(dest);
    } else {
        $('#' + id).insertBefore(dest);
    }
    return dest;
};
