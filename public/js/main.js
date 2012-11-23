var mediaList = new Media.Collection();
var appModel = new App.Model();

var AppRouter = Backbone.Router.extend({

    routes: {
        "media"	: "list",
        "media/page/:page"	: "list",
        "media/add"         : "addMedia",
        "media/search"      : "searchMedia",
        "media/:id"         : "mediaDetails",
        "admin"             : "conf",
        "about"             : "about",
    },

    initialize: function () {
        window.socket = io.connect('http://localhost');
        window.socket.on('medias:swapped', function (swapped) {
            console.log ('got medias:swapped from server', swapped);
        });

        appModel.bindClient();
        this.headerView = new HeaderView({model: appModel});
        $('.header').html(this.headerView.el);
    },

    list: function(page) {
        new MediaListView({model: mediaList});
        this.headerView.selectMenuItem('list-menu');
    },
    mediaDetails: function (id) {
        mediaList.fetch({success: function(collection, resp){
            collection.bindClient();
            new MediaView({model: mediaList.get(id)});
        }});
        this.headerView.selectMenuItem('list-menu');
    },

    addMedia: function() {
        var media = new Media.Model();
        new MediaView({model: media});
        this.headerView.selectMenuItem('add-menu');
    },

    mediaSearch: function (id) {
        var media = new Media.Model({_id: id});
        media.fetch({success: function(){
            $("#content").html(new SearchView({model: media}).el);
        }});
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
