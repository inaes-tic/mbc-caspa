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
if (!BackboneIO && (typeof require !== 'undefined')) BackboneIO = require('backboneio');

Media.Model = BackboneIO.Model.extend({
    urlRoot: "media",
    idAttribute: "_id",
    initialize: function () {
        this.validators = {};

        this.validators.file = function (value) {
            return value.length > 0 ? {isValid: true} : {isValid: false, message: "You must enter a name"};
        };
    },

    validateItem: function (key) {
        return (this.validators[key]) ? this.validators[key](this.get(key)) : {isValid: true};
    },

    // TODO: Implement Backbone's standard validate() method instead.
    validateAll: function () {

        var messages = {};

        for (var key in this.validators) {
            if(this.validators.hasOwnProperty(key)) {
                var check = this.validators[key](this.get(key));
                if (check.isValid === false) {
                    messages[key] = check.message;
                }
            }
        }

        return _.size(messages) > 0 ? {isValid: false, messages: messages} : {isValid: true};
    },
    defaults: {
        _id: null,
        file: "None",
        name: "",
        audio: "None",
        video: "None",
        pos: 0
    }
});

Media.Collection = BackboneIO.Collection.extend({
    model: Media.Model,
    url: 'media',
    comparator: function(media) {
//        console.log("compare", media, media.get('pos'));
        return media.get('pos');
    },

});

if(server) module.exports = Media;
else root.Media = Media;
