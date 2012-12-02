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

BackboneIO.Model.prototype.initialize = function () {
    if (server) {
        console.log ('SEEN ON SERVER');
        return this.set({_NEW: false})
    }

    if (this.attributes.hasOwnProperty('_NEW'))
        return this.get('_NEW');

    return this.set({_NEW: true});
},

BackboneIO.Model.prototype.isNew = function () {
    return this.get('_NEW');
},

BackboneIO.Model.prototype.view = function (args) {
    if (server) {
        console.error ("asking for view on server ?");
        return false;
    }

    if (! this.options.view) {
        console.error ("you didn't configure this model properly");
        return false;
    }

    return new this.options.view (args);
}

BackboneIO.Model.prototype.get_id = function () {
    return this.get(this.idAttribute || console.error ('could not get idAttribute'));
};

BackboneIO.Model.prototype.set_id = function (id, opts) {
    var idAttr = this.idAttribute || console.error ('could not get idAttribute');
    var attrs = {}
    attrs[idAttr] = id;
//    return this.set(idAttr, id, opts);
    return this.set(attrs, opts);
};

BackboneIO.Model.prototype.index2Pos = function (index) {
    return index || 0;
};

BackboneIO.Model.prototype.get_index = function () {
    return this.get('pos');
};

BackboneIO.Model.prototype.set_index = function (index, opts) {
    this.set({pos: this.index2Pos(index)}, opts);
    return this;
};

BackboneIO.Collection.prototype._set_index = function (model, index) {
    if (model.attributes) {
        model.set_index(index)
    } else {
        model.pos = index;
    }
},

BackboneIO.Collection.prototype.index_add = function (model, opts) {
    var index = (opts && opts.at) ? opts.at : this.size();
    this._set_index (model, index);
    opts.at = index;
    this.add (model, opts);
    return this.models[index];
}

BackboneIO.Collection.prototype.create = function (model, opts) {
    var index = (opts && opts.at) ? opts.at : this.size();
    this._set_index (model, opts);
    return Backbone.Collection.prototype.create.call (this, model, opts);
}

BackboneIO.Collection.prototype.move = function (from, to) {
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

BackboneIO.Collection.prototype.comparator = function (model) {
    return model.get_index();
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
