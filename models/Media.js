var Media, server = false;
if (typeof exports !== 'undefined') {
    BackboneIO = require(__dirname + '/Default');
    _ = require('underscore');
    Media = exports.Media = {};
    server = true;
} else {
    Media = root.Media = {};
}

var leadingZero = function (num) {
    return (num < 10) ? "0"+num : num;
}

var toMilliseconds = function (time) {
    if (!time) {
        console.error("No time");
        return -1;
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

Media.Model = BackboneIO.Model.extend({
    urlRoot: "media",
    idAttribute: "_id",
    validate: function (attrs) {
        console.log ("checking", attrs);
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
Media.Collection = BackboneIO.Collection.extend({
    model: Media.Model,
    url: 'media',
});


Media.Piece = Media.Model.extend ({
    urlRoot: 'piece',
    defaults: {
        trim: {
            timein:  0,
            timeout: 0,
        },
        overlay: [],
    },
});

Media.Block = Media.Collection.extend ({
    model: Media.Piece,
    url: 'piece',
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

        console.trace();
        console.log ("initing media list", models, col);
        if (!col || col instanceof Array) {
            col = this.newCol(models, {connectable: true});
            console.log ('col is array ! recreating as collection', col);
        }

        var self = this;
        col.wrapper = this;

        col.bind('all', function (a, b) {
            console.log ('got a change in the force', a, b);
            var models = self.get('collection').models;
            self.set({models: models});
            self.update_duration(col);
            console.log ('-----got a change in the force', a, b);
        }, this);

        this.set ({collection: col, models: col.models});
        Media.Model.prototype.initialize.call (this);
    },
    update_duration: function (col) {
        console.log ('TOTAL TIME IN MODEL', col.pluck('durationraw'));
        this.set({duration : arrayDuration(col.pluck('durationraw'))});
        console.log ('TOTAL TIME IN MODEL->', this.pretty_duration());
    },
    pretty_duration: function () {
        return prettyTime (this.get('duration'));
    },

    defaults: {
        collection: null,
        models: [],
        name: null,
        hash: null,
        fixed: false,
        duration: 0,
        pos: 0,
    },
});

Media.Universe = Media.Collection.extend ({
    url: 'list',
    model: Media.List,
});

Media.Occurence = Media.List.extend ({
    urlRoot: 'sched',
    defaults: {
        event: null,
    },
    newCol: function (models, opts) {
        return new Media.Occurence (models, opts);
    },
});

Media.Schedule = Media.Universe.extend ({
    url: 'sched',
    model: Media.Occurence,
});

if(server) module.exports = Media;
else root.Media = Media;
