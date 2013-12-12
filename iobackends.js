var    _ = require('underscore'),
     mbc = require('mbc-common'),
    conf = mbc.config.Caspa,
    search_options = mbc.config.Search,
    data = mbc.config.Data,
    uuid = require('node-uuid'),
    logger = mbc.logger().addLogger('caspa_backends'),
    backboneio = require('backbone.io');

// Override mongoStore read method with custom
var searchWrapper = require('./searchWrapper.js');

var iobackends = module.exports = exports = function (db, publisher) {
    var self = this;
    this.middlewares = {
        debug: function (req, res, next) {
            logger.debug('Backend:', req.backend);
            logger.debug('Method: ', req.method);
            logger.debug('Channel:', req.channel);
            logger.debug('Options:', JSON.stringify(req.options));
            logger.debug('Model:  ', JSON.stringify(req.model));
            next();
        },

        id: function (req, res, next) {
            if( req.method == 'create' && req.model._id === undefined) {
                req.model._id = uuid.v1();
            }
            next();
        },

        publishJSON: function (req, res, next) {
            publisher.publishJSON([req.backend, req.method].join('.'), { model: req.model });
            next();
        }
    };

    this.backends = {
        app: {
            use: [backboneio.middleware.configStore()]
        },
        Transforms: {
            use: [this.middlewares.id],
            mongo: {
                db: db,
                collection: data.Transforms.collection_db,
                opts: { search: search_options.Transforms },
            }},
        Medias: {
            mongo: {
                db: db,
                collection: data.Medias.collection_db,
                opts: { search: search_options.Medias },
            }},
        Pieces: {
            use: [this.middlewares.id],
            mongo: {
                db: db,
                collection: data.Pieces.collection_db,
                opts: { search: search_options.Pieces },
            }},
        Lists: {
            use: [this.middlewares.id],
            mongo: {
                db: db,
                collection: data.Lists.collection_db,
                opts: { search: search_options.Lists },
            }},
        Scheds: {
            use: [this.middlewares.id, this.middlewares.publishJSON],
            mongo: {
                db: db,
                collection: data.Scheds.collection_db,
                opts: { search: search_options.Scheds },
            }},
        Status: {
            use: [this.middlewares.id],
            mongo: {
                db: db,
                collection: data.Status.collection_db,
                opts: { search: search_options.Status },
            }},
        frame: {
            use: [backboneio.middleware.memoryStore(db, 'progress', {})],
        },
        Mostomessages: {
            mongo: {
                db: db,
                collection: data.Mostomessages.collection_db,
                opts: { search: search_options.Mostomessages },
            }},
        Sketchs: {
            use: [this.middlewares.id],
            mongo: {
                db: db,
                collection: data.Sketchs.collection_db,
                opts: { search: search_options.Sketchs },
            }},
    };

    /* process the backends object to streamline code */
    var binded = [];
    _(this.backends).each (function (backend) {
        backend.io = backboneio.createBackend();
        if (backend.use) {
            _(backend.use).each (function (usefn) {
                backend.io.use(usefn);
            });
        }
        if (backend.mongo) {
            var mongo = _.extend ({db: db, opts: {}}, backend.mongo);
            var fn = _.identity;
            binded.push (backend.mongo.collection);

            if (_.has(mongo.opts, 'search'))
                fn = searchWrapper;
            backend.io.use(
                fn(backboneio.middleware.mongoStore(mongo.db,
                                                    mongo.collection,
                                                    mongo.opts)));
        }
        backend.io.use (self.middlewares.debug);
    });

    logger.info ('binding to mongo collections:', binded.join(', ') + '.');
};

iobackends.prototype.register_sync = function (collection, name) {
    var backend = this.get_io (name);
    function sync (method, model, options) {
        var event = {create: 'created', read: 'updated', update: 'updated', delete: 'removed'};

        logger.warn ('in sync for backend', name, method, event[method]);

        backend.emit (event[method], model.toJSON());
    };

    collection.osync = sync;
};

iobackends.prototype.emit = function (name, args) {
    _.apply(this.backends[name].emit, args);
};

iobackends.prototype.get_ios = function () {
    var ret = {};
    var self = this;
    _(_.keys(this.backends)).each (function (backend) {
        var key = (_.has(data, backend))? data[backend]['backend'] : backend + 'backend';
        ret[key] = self.backends[backend].io;
    });
    return ret;
};

iobackends.prototype.get = function (name) {
    return this.backends[name];
};

iobackends.prototype.get_io = function (name) {
    return this.get(name).io;
};
