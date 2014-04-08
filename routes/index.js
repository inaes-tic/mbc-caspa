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
        'kineticjs/kinetic.min.js',
    ];

    var vendorLibDir = [
        'stickyPanel/jquery.stickyPanel.js',
        'airtime/common.js',
        'knockout-drag-binding.js',
    ];

    var vendorCommonLibDir = [
        'jquery-ui.toggleSwitch.js',
        'knockout-jqueryui.min.js',
        'knockout-common-binding.js',
    ];

    var vendorJs = new folio.Glossary(
        addPath(bower_common_lib_dir, vendorBower)
        .concat(addPath(lib_dir, vendorLibDir))
        .concat(addPath(common_lib_dir, vendorCommonLibDir))
        .concat([
            require.resolve('fullcalendar-browser/fullcalendar/fullcalendar.js'),
            require.resolve('typeahead.js/dist/typeahead.bundle.min.js'),
        ])
    , {minify: false}); //XXX Hack Dont let uglify minify this: too slow

    // serve using express

    app.get('/js/vendor.js', folio.serve(vendorJs));

    var vendorOtherBower = [
        'backbone-pageable/lib/backbone-pageable.js',
        'backbone-relational/backbone-relational.js',
    ];

    //XXX Hack to include relational after backbone.io
    var vendorOthersJs = new folio.Glossary(
        addPath(bower_common_lib_dir, vendorOtherBower)
    , {minify:app.get('minify')});

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
                 'transcode',
                 'upload-resumable',
                 'universe',
                 'schedule',
                 'about',
                 'airtime/schedule/full-calendar-functions'
                ];

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
                     'upload',
                     'transcode',
                     'universe',
                     'uniitem',
                     'schedule',
                     'emptyalert',
                     'timeinfo',
                     'nowplaying',
                     'sourceinfo',
                     'typeahead_suggestion',
                     'typeahead_header',
                     'typeahead_footer',
                     'typeahead_empty',
                    ];

    var localTemplatesFiles =  localTemplates.map( function (e) {
        return path.join(__dirname, '..', 'views/templates/', e + '.jade');
    });

    var localViewsFiles  = localViews.map( function(e) {
        return path.join(__dirname, '..', 'public/js/views/', e + '.js');
    });

    var views = {
        caspa: {
            js:         localViewsFiles,
            templates:  localTemplatesFiles,
            styles:     [],
            images:     [],
            models:     ['Default', 'App', 'Media', 'Editor', 'Sketch'],
            widgets:    ['WebvfxSimpleWidget', 'WebvfxAnimationWidget'],
        },
    };

    _.extend(mbc.views.views, views);

    mbc.views.views.caspa = mbc.views.setupView(mbc.views.views.caspa);
    var merge = mbc.views.mergeViews('editor','config','caspa');
    var folios = mbc.views.makeViewFolios(merge);

    app.get('/js/views.js', folio.serve(folios.js));
    app.get('/js/models.js', folio.serve(folios.models));
    app.get('/js/templates.js', folio.serve(folios.templates));
    app.get('/js/widgets.js', folio.serve(folios.widgets));

    app.get('*',  function(req, res) {
        res.render('index', { name: conf.Branding.name,
                              description: conf.Branding.description });
    });

    return appCollection;
}
