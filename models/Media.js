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
    initialize: function () {
        this.validators = {};

        this.validators.file = function (value) {
            return value.length > 0 ? {isValid: true} : {isValid: false, message: "You must enter a name"};
        };
    },
    index2Pos: function (index) {
        return index;
    },
    validate: function (attrs) {
        if (! attrs.file || ! attrs.file.length)
            return new Error("file must be defined");
        if (! attrs.stat || ! attrs.stat.length)
            return new Error("stat must be defined");
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
});

if(server) module.exports = Media;
else root.Media = Media;
