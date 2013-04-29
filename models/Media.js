// Save a reference to the global object (`window` in the browser, `global`
// on the server).
var root = this;

// The top-level namespace. All public Backbone classes and modules will
// be attached to this. Exported for both CommonJS and the browser.
var Media, server = false;
if (typeof exports !== 'undefined') {
    Media = exports;
    server = true;
} else {
    Media = root.Media = {};
}

// Require Underscore, Backbone & BackboneIO, if we're on the server, and it's not already present.
var _ = root._;
if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

var BackboneIO = root.BackboneIO;
if ((typeof require !== 'undefined')) Backbone = require('backbone');

var leadingZero = function (num) {
    return (num < 10) ? "0"+num : num;
}

var toMilliseconds = function (time) {
    if (!time) {
        console.log ("No time");
        return 0;
    }

    var t = time.match(/(\d{2}):(\d{2}):(\d{2})\.(\d*)/);
    t.shift();
    d = moment.duration ({
        hours:        t[0],
        minutes:      t[1],
        seconds:      t[2],
        milliseconds: t[3]*10
    });

    return d.asMilliseconds();
};

var prettyTime =  function (m) {
    d = moment.duration(m);
    var p = leadingZero(d.hours())   + ':'
        + leadingZero(d.minutes()) + ':'
        + leadingZero(d.seconds()) + '.'
        + leadingZero(d.milliseconds()/10);
    return p;
};

var arrayDuration = function (a) {
    return  _.reduce(a, function (m, n) {
        return m + toMilliseconds (n);}, 0);
};

var Media = {};

Media.Model = Backbone.Model.extend({
    urlRoot: "media",
    idAttribute: "_id",
    initialize: function () {
        console.log ('creating new Media.Model');
    },
    validate: function (attrs) {
        console.log ("checking -> ", attrs);
        if (attrs.file && ! attrs.file.length) {
            console.log ('NO file');
            return new Error("file must be defined");
        }
        if (attrs.stat       &&
            (! attrs.stat.mtime ||
             ! attrs.stat.size  ||
             attrs.stat.size <= 4000)) {
            console.log ('NO or BAD stat');
            return new Error("stat must be defined");
        }
    },
    defaults: {
        _id: '',
        stat: {},
        file: "None",
        name: "",
        audio: "None",
        video: "None",
        template: 'mediaview',
        notes: "",
    }
});

/* all methods are overriden in Default.js */
Media.Collection = Backbone.Collection.extend({
    model: Media.Model,
    url: 'media',
    backend: 'mediabackend',
    initialize: function () {
        if (!server) {
            this.bindBackend();

            this.bind('backend', function(method, model) {
                console.log ('got from backend:', method, model);
            });
        }
        console.log ('creating new Media.Collection');

        Backbone.Collection.prototype.initialize.call (this);
    }
});


Media.Piece = Media.Model.extend ({
    urlRoot: 'piece',
    idAttribute: "_id",
    defaults: {
        trim: {
            timein:  0,
            timeout: 0,
        },
        overlay: [],
        starts: 0,
        ends: 0,
    },
    initialize: function (attributes, options) {
        console.log ('creating new Media.Piece');
        if (this.idAttribute in attributes) {
            // we got a Media id, replace it with an uuid.
            if ( !attributes['_id'].match(/-/) ) {
               this.set(this.idAttribute, uuid.v4(), {silent: true});
            }
        }
    },

});

Media.Block = Media.Collection.extend ({
    model: Media.Piece,
    url: 'piece',
    backend: 'blockbackend',
    initialize: function () {
        if (!server)
            this.bindBackend();
        console.log ('creating new Media.Block');
    },

});

Media.List = Media.Model.extend ({
    urlRoot: 'list',
    newCol: function (models, opts) {
        return new Media.Block (models, opts);
    },
    initialize: function () {
        var models = this.get('models')
        var col    = this.get('collection')

        if (!models)
            return false;

        console.log ("creating new Media.List", models, col);
        if (!col || col instanceof Array) {
            console.log ('col is array ! recreating as collection', col, models);
            col = this.newCol(models, {connectable: true});
        }

        var self = this;
        col.wrapper = this;

        col.bind('all', function (a, b) {
            var models = self.get('collection').models;
            self.set({models: models});
            self.update_duration(col);
            console.log ('-----got a change in the force', a, b);
        }, this);

        this.set ({collection: col, models: col.models});
        Media.Model.prototype.initialize.call (this);
    },
    update_duration: function (col) {
        this.set({duration : arrayDuration(col.pluck('durationraw'))});
    },
    pretty_duration: function () {
        return prettyTime (this.get('duration'));
    },

    defaults: {
        collection: null,
        models: [],
        name: null,
        fixed: false,
        duration: 0,
        pos: 0,
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, success, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

//XXX:
      // If we're not waiting and attributes exist, save acts as `set(attr).save(null, opts)`.
      if (attrs && (!options || !options.wait) && !this.set(attrs, options)) return false;

      options = _.extend({validate: true}, options);

      // Do not persist invalid models.
      if (!this._validate(attrs, options)) return false;

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      success = options.success;
      options.success = function(model, resp, options) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
//XXX:
        delete serverAttrs['collection'];
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
      };

      // Finish configuring and sending the Ajax request.
      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },


});

Media.Universe = Media.Collection.extend ({
    url: 'list',
    model: Media.List,
    backend: 'listbackend',
    initialize: function () {
        if (!server)
            this.bindBackend();
        console.log ('creating new Media.Universe');
    },
});

Media.Occurrence = Media.List.extend ({
    urlRoot: 'occur',
    defaults: {
        event: null,
    },
    initialize: function () {
        console.log ('creating new Media.Occurrence', this);
        this.overlapsWith = [];
    },
    newCol: function (models, opts) {
        return new Media.Occurrence (models, opts);
    },
    update: function (attrs) {
        for (a in this.attributes) {
            if (attrs.hasOwnProperty(a))
                this.set(a, attrs[a]);
        }
    },
    getOverlappingEvents: function() {
        // Get all events that overlap with this one
        var self = this;
        return this.collection.filter(function(oc) {
                    return (oc.get('_id') != self.get('_id') &&
                            oc.get('start') < self.get('end') &&
                            oc.get('end') > self.get('start'));
               });
    },
    validate: function(attrs, options) {
        // Do not validate when fetching from the server
        if (options.parse) return;
        // Only save model if it's not overlapping with anything
        var self = this;
        overlapping = this.getOverlappingEvents();
        if (overlapping.length) {
            overlapping.forEach(function(oc) {
                oc.overlapsWith.push(self);
            });
            this.collection.trigger('overlap', true);
            return overlapping
        } else {
            /* When this event is no longer overlapping, the other events could be valid.
               validationError would be unset after this function returns, but I need if before
               I call checkOverlap. Could be improved. */
            
            delete this.validationError;
            // Prevent infinite loops by first emptying the list            
            var overlapsWith = _.clone(this.overlapsWith);
            this.overlapsWith = [];
            
            overlapsWith.forEach(function(oc) {
                oc.save();
            });
            
            this.collection.checkOverlap();
        }
    },
});

Media.Schedule = Media.Universe.extend ({
    url: 'occur',
    model: Media.Occurrence,
    backend: 'schedbackend',
    initialize: function () {
        if (!server)
            this.bindBackend();
        console.log ('creating new Media.Schedule');
        this.on('add remove', this.checkOverlap)
    },
    comparator: "start",
    getInvalid: function() {
        return this.filter(function(oc) {
            return oc.validationError
        });
    },
    checkOverlap: function() {
        var elems = this.getInvalid();
        this.trigger('overlap', elems.length);
    }
});

