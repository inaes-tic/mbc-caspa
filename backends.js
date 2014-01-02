var mbc            = require('mbc-common'),
    search_options = mbc.config.Search,
    collections    = mbc.config.Common.Collections,
    backboneio     = require('backbone.io')
;

module.exports = function (db) {
    var backends = {
        app: {
            use: ['configStore']
        },
        transform: {
            use: ['uuid'],
            mongo: {
                db: db,
                collection: collections.Transforms,
                opts: { search: search_options.Transforms },
            }},
        media: {
            mongo: {
                db: db,
                collection: collections.Medias,
                opts: { search: search_options.Medias },
            }},
        piece: {
            use: ['uuid'],
            mongo: {
                db: db,
                collection: collections.Pieces,
                opts: { search: search_options.Pieces },
            }},
        list: {
            use: ['uuid'],
            mongo: {
                db: db,
                collection: collections.Lists,
                opts: { search: search_options.Lists },
            }},
        sched: {
            use: ['uuid', 'publishJSON'],
            mongo: {
                db: db,
                collection: collections.Scheds,
                opts: { search: search_options.Scheds },
            }},
        status: {
            use: ['uuid'],
            mongo: {
                db: db,
                collection: collections.Status,
                opts: { search: search_options.Status },
            }},
        frame: {
            use: [backboneio.middleware.memoryStore(db, 'progress', {})],
        },
        mostomessages: {
            mongo: {
                db: db,
                collection: collections.Mostomessages,
                opts: { search: search_options.Mostomessages },
            }},
        sketch: {
            use: ['uuid'],
            mongo: {
                db: db,
                collection: collections.Sketchs,
                opts: { search: search_options.Sketchs },
            }},
        user: {
            use: ['uuid'],
            mongo: {
                db: db,
                collection: collections.Auth,
            }},
    };

    return backends;
};

