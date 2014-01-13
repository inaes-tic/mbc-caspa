var _ = require('underscore')
;
module.exports = {
    types: [{
        type: 'image',
        seconds: 0,
        isMedia: function(filename) {
            return filename.match(/\.(bmp|gif|jpg|png|yuv|pix|dpx|exr|jpeg|pam|pbm|pcx|pgm|pic|ppm|ptx|sgi|tif|tiff|webp|xbm|xwd)$/i);
        }
    },
    {
        type: 'video',
        seconds: 5,
        isMedia: function(filename) {
            return filename.match(/\.(webm|mp4|flv|avi|mpeg|mpeg2|mpg|mov|mkv|ogm|ogg)$/i);
        }
    }],
    isMedia: function(filename) {
        return _.some(this.types, function(type) {
            return type.isMedia(filename);
        });
    },
    getType: function(filename) {
        return _.find(this.types, function(type) {
            return type.isMedia(filename);
        });
    },
    getSeconds: function(type) {
        return _.findWhere(this.types, {type: type}).seconds;
    }
};