var mediaList = new Media.Collection();
var mediaDB   = new Media.List({collection: mediaList,
                                fixed: true,
                                name: 'Media Database'});
var editList;

var Universe  = new Media.Universe();

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
        "media/add"         : "upload",
        "media/search"      : "searchMedia",
        "media/edit"        : "editMedia",
        "media/:id"         : "mediaDetails",
        "program/:id"       : "listProgram",
        "universe"          : "listUniverse",
        "admin"             : "conf",
        "about"             : "about",
    },

    initialize: function () {
        window.socket = io.connect('http://localhost');
        window.socket.on('medias:moved', function (move) {
            console.log ('got medias:moved from server', move);
        });

        appModel.fetch({success: function(model, resp){
            model.bindClient();
        }});

        mediaList.fetch({success: function(collection, resp){
            collection.bindClient();
        }});

        Universe.fetch({success: function(collection, resp){
            collection.bindClient();
        }});

        this.headerView = new HeaderView({model: appModel});
        $('.header').html(this.headerView.el);
    },

    list: function() {
        new MediaListView({model: mediaDB});
        this.headerView.selectMenuItem('list-menu');
    },

    listUniverse: function () {
        new UniverseListView({collection: Universe});
    },

    mediaDetails: function (id) {
        mediaList.fetch({success: function(collection, resp){
            collection.bindClient();
            new MediaView({model: mediaList.get(id)});
        }});
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
        new EditView ({el: $("#content")});
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
