module.exports = function(app, everyauth) {
    var path = require('path')
    , _ = require('underscore')
    , folio = require('folio')
    , jade = require('jade')
    , po2json = require('po2json')
    , i18n = require('i18n-abide')
    , mbc = require('mbc-common')
    , conf = mbc.config.Caspa
    , commonConf = mbc.config.Common
    , confWebvfx = mbc.config.Webvfx
    , logger  = mbc.logger().addLogger('caspa_routes');

    var self = require ('mbc-common/models/App.js')
    , appCollection = new self.Collection();

    appCollection.bind('change', function (model) {
        logger.info("model " + 'change' + "->" + 'change', model);
        _.each(model.sockets, function (socket) {
            socket.broadcast.emit(model.url  + ':' + 'change', model.toJSON());
        });
    });

    app.get('/po/:id', function (req, res) {
        var lang = req.params.id;
        var locale = i18n.localeFrom(lang);
        var jsondata = '';
        try {
            jsondata = po2json.parseSync('locale/' + locale + '/LC_MESSAGES/messages.po');
            res.send (jsondata);
        } catch (e) {
            logger.error(e);
        }
    });

    app.get('/live.webm', function(req, res) {
        if(confWebvfx.Editor.stream_url) {
            res.redirect(confWebvfx.Editor.stream_url);
        } else {
            res.json({});
        }
    });

    /**
     * Vendor Javascript Package
     */

    var lib_dir                 = path.join(__dirname, '..', 'vendor');
    var common_dir              = path.join('node_modules','mbc-common');
    var common_lib_dir          = path.join(__dirname, '..', common_dir, 'vendor');
    var bower_common_lib_dir    = path.join(__dirname, '..', common_dir, 'bower_components');

    var addPath = function (dir, libs) {
        return _.map(libs, function(lib) {
            return path.join(dir, lib);
        });
    }

    var vendorBower = [
        'jquery/jquery.min.js',
        'bootstrap/docs/assets/js/bootstrap.min.js',
        'jqueryui/ui/minified/jquery-ui.min.js',
        'underscore/underscore.js',
        'backbone/backbone-min.js',
        'knockout.js/knockout.js',
        'knockback/knockback-core.min.js',
        'node-uuid/uuid.js',
        'moment/moment.js',
        'jed/jed.js',
        'backbone-modal/backbone.modal-min.js',
        'spark-md5/spark-md5.min.js',
        'sprintf/src/sprintf.js',
        'resumablejs/resumable.js',
        'd3/d3.js',
        'knockout-sortable/build/knockout-sortable.js',
        'bootstrap-paginator/build/bootstrap-paginator.min.js',
        'backbone.memento/backbone.memento.js',
    ];

    var vendorLibDir = [
        'jquery-ui.toggleSwitch.js',
        'stickyPanel/jquery.stickyPanel.js',
        'airtime/common.js',
        'knockout-drag-binding.js',
        'knockout-jqueryui.min.js',
        'knockout-common-binding.js',
    ];

    var vendorCommonLibDir = [
        'kinetic-v4.5.2.min.js'
    ];

    var vendorJs = new folio.Glossary(
        addPath(bower_common_lib_dir, vendorBower)
        .concat(addPath(lib_dir, vendorLibDir))
        .concat(addPath(common_lib_dir, vendorCommonLibDir))
        .concat([
            require.resolve('fullcalendar-browser/fullcalendar/fullcalendar.js'),
        ])
    , {minify: false}); //XXX Hack Dont let uglify minify this: too slow

    // serve using express

    app.get('/js/vendor.js', folio.serve(vendorJs));

    //XXX Hack to include relational after backbone.io
    var vendorOthersJs = new folio.Glossary([
        path.join(lib_dir, 'visualsearch/build-min/visualsearch.js'),
        require.resolve('backbone-pageable/lib/backbone-pageable.js'),
        require.resolve('backbone-relational/backbone-relational.js'),
    ], {minify:app.get('minify')});

    app.get('/js/vendor_others.js', folio.serve(vendorOthersJs));

    /**
     * Views Javascript Package
     */

    var localViews = ['paginator',
                 'header',
                 'home',
                 'playbar',
                 'masterview',
                 'panelview',
                 'medialist',
                 'mediadetails',
                 'mediasearch',
                 'mediaedit',
                 'playout',
                 'programlist',
                 'conf',
                 'transcode',
                 'upload-resumable',
                 'universe',
                 'schedule',
                 'about',
                 'airtime/schedule/full-calendar-functions'
                ];

    var commonViews = [ 'editor' ];

    var localViewsFiles  = localViews.map( function(e) {
        return path.join(__dirname, '..', 'public/js/views/', e + '.js');
    });
    var commonViewsFiles = commonViews.map( function(e) {
        return require.resolve('mbc-common/views/js/' + e);
    });

    var viewsJs = new folio.Glossary(
        localViewsFiles.concat(commonViewsFiles),
        { minify:app.get('minify') }
    );

    app.get('/js/views.js', folio.serve(viewsJs));

    /**
     * Models Javascript Package
     */

    var models = ['Default', 'App', 'Media', 'Editor', 'Sketch'];

    var modelsJs = new folio.Glossary(
        models.map (function (e) {
            return require.resolve('mbc-common/models/' + e);
        })
    );

    app.get('/js/models.js', folio.serve(modelsJs));


    commonConf.Widgets.Files.forEach(function(widget) {
        app.get(
            '/js/widgets/' + widget + '.js',
            folio.serve(
                new folio.Glossary([
                    require.resolve('mbc-common/widgets/' + widget)
                ])
            )
        );
    });

    /**
     * Template Javascript Package
     *
     * We are going to use pre-compiled
     * jade on the client-side.
     */

    var localTemplates = ['form',
                     'item',
                     'playbar',
                     'header',
                     'masterview',
                     'panelview',
                     'medialist',
                     'mediaview',
                     'mediasearch',
                     'mediaedit',
                     'playout',
                     'confview',
                     'upload',
                     'transcode',
                     'universe',
                     'uniitem',
                     'schedule',
                     'emptyalert',
                     'timeinfo',
                     'nowplaying',
                     'sourceinfo'
                    ];

    var commonTemplates = ['editor',
                           'objects',
                           'alert',
                           'confirm',
                           'prompt',
                          ];

    var getFileName = function (e) {
        return path.join(__dirname, '..', 'views/templates/', e + '.jade');
    };

    var getCommonFileName = function (e) {
        return require.resolve('mbc-common/views/templates/' + e + '.jade');
    };

    var templateJs = new folio.Glossary([
        require.resolve('jade/runtime.js'),
        path.join(__dirname, '..', 'views/templates/js/header.js')].concat(
            localTemplates.map(getFileName), commonTemplates.map(getCommonFileName)
        ),
        {
        compilers: {
            jade: function (name, source) {
                return 'template[\'' + name + '\'] = ' +
                    jade.compile(source, {
                        filename: getFileName(name),
                        client: true,
                        compileDebug: false
                    }) + ';';
            }
        }
    });

    // serve using express
    app.get('/js/templates.js', folio.serve(templateJs));

    app.get('*',  function(req, res) {
        res.render('index', { name: conf.Branding.name,
                              description: conf.Branding.description });
    });

    return appCollection;
}
