var mediaList = new Media.Collection();
var AppRouter = Backbone.Router.extend({

    routes: {
        "media"	: "list",
        "media/page/:page"	: "list",
        "media/add"         : "addMedia",
        "media/search"      : "searchMedia",
        "media/:id"         : "mediaDetails",
        "about"             : "about",
    },

    initialize: function () {
        var appModel = new App.Model();
        window.socket = io.connect('http://127.0.0.1:3000');
        this.headerView = new HeaderView({model: appModel});
        $('.header').html(this.headerView.el);
    },

    list: function(page) {
        var p = page ? parseInt(page, 10) : 1;
        mediaList.fetch({success: function(collection, resp){
            collection.bindClient();
            new MediaListView({model: mediaList, page: p});
        }});
        this.headerView.selectMenuItem('home-menu');
    },

    mediaDetails: function (id) {
        var media = new Media.Model({_id: id});
        media.fetch({success: function(){
            console.log("here");
            $("#content").html(new MediaView({model: media}).el);
        }});
        this.headerView.selectMenuItem();
    },

    addMedia: function() {
        var media = new Media.Model();
        $('#content').html(new MediaView({model: media}).el);
        this.headerView.selectMenuItem('add-menu');
	},

    mediaSearch: function (id) {
        var media = new Media.Model({_id: id});
        media.fetch({success: function(){
            $("#content").html(new SearchView({model: media}).el);
        }});
        this.headerView.selectMenuItem();
    },

    searchMedia: function() {
        var media = new Media.Model();
        $('#content').html(new SearchView({model: media}).el);
        this.headerView.selectMenuItem('add-menu');
	},

    about: function () {
        if (!this.aboutView) {
            this.aboutView = new AboutView();
        }
        $('#content').html(this.aboutView.el);
        this.headerView.selectMenuItem('about-menu');
    }

});

    app = new AppRouter();
    Backbone.history.start();
