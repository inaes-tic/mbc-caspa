var mediaList = new Media.Collection();
var mediaDB   = new Media.List({collection: mediaList,
                                fixed: true,
                                name: 'Media Database'});
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

var appModel = new App.Model();

var AppRouter = Backbone.Router.extend({

    routes: {
        "media"	: "list",
        "media-draggable"   : "list_draggable",
        "universe"          : "universe",
        "universe-draggable": "universe_draggable",
        "media/add"         : "upload",
        "media/search"      : "searchMedia",
        "media/edit"        : "editMedia",
        "media/:id"         : "mediaDetails",
        "program/:id"       : "listProgram",

        "schedule"          : "schedule",
        "admin"             : "conf",
        "about"             : "about",
    },

    initialize: function () {
        window.socket = io.connect('http://localhost');
        window.socket.on('medias:moved', function (move) {
            console.log ('got medias:moved from server', move);
        });


        _([mediaList, Universe, Schedule]).each( function (col) {
            console.log ('fetching', col);
            col.fetch();
        });

        this.headerView = new HeaderView({model: appModel});
        $('.header').html(this.headerView.el);
    },

    schedule: function() {
        new ScheduleView({collection: Schedule});
        this.headerView.selectMenuItem('schedule-menu');
    },

    list: function() {
        new MediaListView({model: mediaDB});
        this.headerView.selectMenuItem('list-menu');
    },
    list_draggable: function() {
        new MediaListView({model: mediaDB, draggable: true});
        this.headerView.selectMenuItem('list-menu');
    },

    universe: function () {
        new UniverseListView({collection: Universe});
    },
    universe_draggable: function () {
        new UniverseListView({collection: Universe, draggable: true});
    },


    mediaDetails: function (id) {
        new MediaView({model: mediaList.get(id)});
        this.headerView.selectMenuItem('list-menu');
    },

    upload: function () {
        new UploadView ({model: appModel});
        this.headerView.selectMenuItem('add-menu');
    },

    addMedia: function() {
        var media = new Media.Model();
        new MediaView({model: media});
        this.headerView.selectMenuItem('add-menu');
    },

    editMedia: function() {
        new EditView ({el: $("#content"), collection: Universe});
        this.headerView.selectMenuItem('edit-menu');
    },
    searchMedia: function() {
        var media = new Media.Model();
        $('#content').html(new SearchView({model: media}).el);
        this.headerView.selectMenuItem('search-menu');
    },
    searchMedia: function() {
        var media = new Media.Model();
        $('#content').html(new SearchView({model: media}).el);
        this.headerView.selectMenuItem('search-menu');
    },

    about: function () {
        if (!this.aboutView) {
            this.aboutView = new AboutView();
        }
        $('#content').html(this.aboutView.el);
        this.headerView.selectMenuItem('about-menu');
    },
    conf: function () {
        new ConfView({model: appModel});
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


    app = new AppRouter();
    Backbone.history.start();
