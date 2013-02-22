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
        _id: null,
        file: "None",
        name: "",
        audio: "None",
        video: "None",
        template: 'mediaview',
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
    initialize: function () {
        console.log ('creating new Media.Piece');
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

Media.Occurence = Media.List.extend ({
    urlRoot: 'sched',
    defaults: {
        event: null,
    },
    initialize: function () {
        console.log ('creating new Media.Occurence', this);
    },
    newCol: function (models, opts) {
        return new Media.Occurence (models, opts);
    },
    update: function (attrs) {
        for (a in this.attributes) {
            if (attrs.hasOwnProperty(a))
                this.set(a, attrs[a]);
        }
    },
});

Media.Schedule = Media.Universe.extend ({
    url: 'sched',
    model: Media.Occurence,
    backend: 'schedbackend',
    initialize: function () {
        if (!server)
            this.bindBackend();
        console.log ('creating new Media.Schedule');
    },

});

