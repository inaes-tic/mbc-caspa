/* require all the libs we use */
var _              = require('underscore'),
    express        = require('express'),
    path           = require('path'),
    exec           = require('child_process').exec,
    i18n           = require('i18n-abide'),
    backboneio     = require('backbone.io'),
    moment         = require('moment'),
    uuid           = require('node-uuid'),
/* shared mbc code */
    mbc            = require('mbc-common'),
    conf           = mbc.config.Caspa,
    common_conf    = mbc.config.Common,
    search_options = mbc.config.Search,
    collections    = common_conf.Collections,
    db             = mbc.db(),
    logger         = mbc.logger().addLogger('caspa_server'),
/* utilities */
    pubsub         = {publisher: mbc.pubsub(), listener: mbc.pubsub()},
    utils          = new (require('./utils'))(db),
    backends_conf  = require('./backends')(db),
    iobackends     = new mbc.iobackends(db, backends_conf)
 ;

iobackends.patchBackbone();
    // var auth           = new (require('./auth'))(iobackends);

var     App            = require("mbc-common/models/App");

var Auth = require("mbc-common/models/Auth");

var al = new Auth.UserList();
al.fetch();
logger.error('AL MODELS: ', al.models[0]);

var Media = require("mbc-common/models/Media");

// 
// var ac = new Auth.UserList();
// 
// //iobackends.register_sync(ac, 'user');
// 
// //ac.fetch();
// //var m1 = ac.models[1];
// //ac.models;
// 
// var frame = new App.ProgressStatus();
// frame.fetch();

