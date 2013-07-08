var _ = require('underscore'),
    uuid = require('node-uuid'),
    moment = require('moment'),
    utils = require('../utils'),
    mbc = require('mbc-common'),
    conf = mbc.config.Caspa,
    Media = require('mbc-common/models/Media'),
    async = require('async')
;

var db = mbc.db();
var db_medias = db.collection('medias');
var db_lists  = db.collection('lists');
var db_scheds = db.collection('scheds');

var items = { list: 3 };
var times = { media: 50, list: 100, sched: 50 }

insertData = function (db, models, callback) {
    db.insert(models, {safe:true}, function(err, result) {
        if (err) {
            console.error('error','An error has occurred ' + err);
            return;
        }
        console.log('Inserting data ...');
        callback(err, result);
    });
};

insertMedias = function (times) {
    utils.scrape_files (conf.Dirs.scrape, function (model) {
        var models = [];
        for(var i=0; i < times; i++ ) {
            var id = uuid.v4();
            var clon = _.clone(model);
            _.extend(clon,{ _id: id });
            clon.checksum = id;
            models.push(clon);
        }
        if(models.length) {
            insertData(db_medias, models, function (err, result) {} );
        }
    });
}


findData = function (db, query, callback) {
    db.find(query).toArray(function(err, results) {
        if (err) {
            console.error('error','An error has occurred ' + err);
            return;
        }
        callback(err, results);
    });
}

prepareLists = function (results, list_times, callback) {
    var err = "";
    var lists = [];
    for(var i=0; i < list_times; i++ ) {
        var name =  "List #"+i;
        var id = uuid.v4();
        var list = { _id: id , collection: results, models: results, name: name, fixed: false, duration: 0, pos: 0 }
        list.duration = Media.arrayDuration(_.pluck(results, 'durationraw'));
        lists.push(list);
    }
    callback(err, lists);
}

prepareScheds = function (results, sched_times, callback) {
    var err = "";
    var now = moment();
    var duration = 0;
    var scheds = [];
    _.each(results, function (result) {
        var start = moment(start).add('milliseconds', duration);
        var end = moment(start).add('milliseconds', result.duration);
        for(var i=0; i < sched_times; i++ ) {
            var rnd_time = Math.floor((Math.random()*1000*60*60*24*365)+1);
            var id =  moment(now).subtract('milliseconds', rnd_time).valueOf();
            var sched = { _id: id, title: "Sched #"+i , list: result._id , start: start.valueOf(), end: end.valueOf(), allDay: false, event: null };
            scheds.push(sched);
            start.add('days', 1);
            end.add('days', 1);
        }
        duration = duration + result.duration;
    });
    callback(err, scheds);
};


async.series({
    /*
    medias: function(callback) {
        db_medias.remove(function(err, results) {
            insertMedias(times.media);
        });
    },
    */
    lists: function(callback) {
        findData(db_medias, { $query: {}, $maxScan: items.list } , function(err, results) {
            prepareLists(results, times.list, function(err, lists) {
                db_lists.remove(function(err, result) {
                    insertData(db_lists, lists, function (err, result ) { callback(null, 'ok')  });
                });
            });
        });
    },
    scheds: function(callback) {
        findData(db_lists, {} , function(err, results) {
            prepareScheds(results, times.sched, function (err, scheds) {
                db_scheds.remove(function (err, results) {
                    insertData(db_scheds, scheds, function (err, result) { callback(null, 'ok') });
                });
            });
        });
    },
    close: function(callback) {
        console.log('Closing DB');
        db.close(function () {
            callback(null, 'ok');
        });
    }
},
function(err, results) {
    console.log(results);
});

