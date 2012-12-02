var Media, server = false;
if (typeof exports !== 'undefined') {
    BackboneIO = require(__dirname + '/Default');
    Media = exports.Media = {};
    server = true;
} else {
    Media = root.Media = {};
}

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
    }
});

/* all methods are overriden in Default.js */
Media.Collection = BackboneIO.Collection.extend({
    model: Media.Model,
    url: 'media',
    add: function (models, opts) {
        var self = this;
        console.log ('hacked add', this, models, opts);

        if (!opts)
            opts = {};

        var index = (opts.at) ? opts.at : this.size();
        opts.at = index;

        if (! (models instanceof Array))
            models = [models]

        models.forEach (function (e, i) {
            self.set_index (e, index + i);
            console.log ('aaadododd', e, opts);
        });

        return BackboneIO.Collection.prototype.add.call (this, models.reverse(), opts);
    },
    create: function (model, opts) {
        var index = (opts && opts.at) ? opts.at : this.size();
        this.set_index (model, index);
        return Backbone.Collection.prototype.create.call (this, model, opts);
    },
});

});

Media.Piece = Media.Model.extend({
    urlRoot: "program",
    set_index: function (index, opts) {
        var new_id = this.get(this.idAttribute).split('-')[0] + '-' + index;
        this.set ({_id : new_id}, {silent: true});
        this.set({pos: this.index2Pos(index)}, opts);
        return this
    }
});

Media.Block = Media.Collection.extend ({
    model: Media.Piece,
    url:   'program',
    indexed_id: function (model, index) {
        var new_id = model.get(model.idAttribute).split('-')[0] + '-' + index;
        model.set ({_id : new_id}, {silent: true});
        return new_id;
    }
});

Media.List = Media.Model.extend ({
    urlRoot: 'list',
});

if(server) module.exports = Media;
else root.Media = Media;
