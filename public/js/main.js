var transformList = new Media.TransformCollection();
var mediaList = new Media.Collection();
var pieceList = new Media.PieceCollection();
var Universe  = new Media.Universe();
var Schedule  = new Media.Schedule();

var DEBUG = false;
if (DEBUG) {
    var i = 0;
    cols = [mediaList, Universe, Schedule];
    setInterval (function () {
        for (col in cols) {
            c = cols[col];
            c.create({name: i++, file: 'file' + i, duration: 293829829});
            console.log ('hello, ' + col + ' : ', c.models.length,
                         _.zip(c.pluck('file'), c.pluck('name'), c.pluck('_id')));
        }
    }, 5000);
}


Universe.bind ('all', function (arg) {
    console.log ('UNIVERSE:' , arg);
});

Universe.bind ('add', function (arg) {
    console.log('something happened in the universe',Universe, 'ADD', arg);
    console.trace ();
});

Universe.bind ('create', function (arg) {
    console.log('something happened in the universe',Universe, 'CREATE', arg);
    console.trace ();
});

var appCollection = new App.Collection();

window.appCollection = appCollection;
window.appstatus = new App.Status();
window.framestatus = new App.ProgressStatus();

var AppRouter = Backbone.Router.extend({

    routes: {
        "media"	: "list",
        "universe"          : "universe",
        "media/add"         : "upload",
        "media/edit"        : "editMedia",
        "media/:id"         : "mediaDetails",
        "program/:id"       : "listProgram",

        "playout"           : "playout",
        "schedule"          : "schedule",
        "admin"             : "conf",
        "about"             : "about",
    },

    initialize: function () {
        window.socket = io.connect('http://' + window.location.hostname);
        window.socket.on('medias:moved', function (move) {
            console.log ('got medias:moved from server', move);
        });

        this.headerView = new HeaderView({appstatus: window.appstatus, framestatus: window.framestatus});
    },

    playout: function() {
        var self = this;
        Universe.setQuery({});
        Schedule.setQuery({});
        Universe.fetch({success: function() {
            Schedule.fetch({success: function() {
                new PlayoutView({collection: Schedule});
                self.headerView.selectMenuItem('playout-menu')
            }});
        }});
    },

    schedule: function() {
        var self = this;
        Universe.setQuery({});
        Schedule.setQuery({});
        Universe.fetch({success: function() {
            Schedule.fetch({success: function() {
                new ScheduleView({collection: Schedule});
                self.headerView.selectMenuItem('schedule-menu');
            }});
        }});
    },

    list: function() {
        new MediaListView({model: mediaList});
        this.headerView.selectMenuItem('list-menu');
    },

    universe: function () {
        new UniverseListView({collection: Universe});
    },

    mediaDetails: function (id) {
        new MediaView({model: mediaList.get(id)});
        this.headerView.selectMenuItem('list-menu');
    },

    upload: function () {
        new UploadView ({collection: appCollection});
        this.headerView.selectMenuItem('add-menu');
    },

    addMedia: function() {
        var media = new Media.Model();
        new MediaView({model: media});
        this.headerView.selectMenuItem('add-menu');
    },

    editMedia: function() {
        var self = this;
        mediaList.setQuery({});
        Universe.setQuery({});
        mediaList.fetch({success: function() {
            Universe.fetch({success: function() {
                new EditView ({el: $("#content"), collection: Universe});
                self.headerView.selectMenuItem('edit-menu');
            }});
        }});
    },

    about: function () {
        if (!this.aboutView) {
            this.aboutView = new AboutView();
        }
        $('#content').html(this.aboutView.el);
        this.headerView.selectMenuItem('about-menu');
    },
    conf: function () {
        new ConfView({collection: appCollection});
        this.headerView.selectMenuItem('conf-menu');
    },
});

var lang = $('html')[0].lang;
var i18n;
$.ajax({
    type: 'GET',
    url: '/po/' + lang,
    dataType: 'json',
    success: function(data) {
        i18n = new Jed ({
            locale_data : data,
            'domain' : 'messages'
        });
    },
    data: {},
    async: false
});


appCollection.fetch({success: function() {
    mediaList.fetch({success: function() {
        transformList.fetch({success: function() {
            pieceList.fetch({success: function() {
                Universe.fetch({success: function() {
                    Schedule.fetch({success: function() {
                        app = new AppRouter();
                        Backbone.history.start();
                    }});
                }});
            }});
        }});
    }});
}});
