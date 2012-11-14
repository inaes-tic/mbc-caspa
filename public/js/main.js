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
        window.socket = io.connect('http://127.0.0.1:3000');
        this.headerView = new HeaderView();
        $('.header').html(this.headerView.el);
    },

    list: function(page) {
        var p = page ? parseInt(page, 10) : 1;
        mediaList.fetch({success: function(collection, resp){
            collection.bindClient();
            $("#content").html(new MediaListView({model: mediaList, page: p}).el);
        }});
        this.headerView.selectMenuItem('home-menu');
    },

    mediaDetails: function (id) {
        var media = new Media({_id: id});
        media.fetch({success: function(){
            $("#content").html(new MediaView({model: media}).el);
        }});
        this.headerView.selectMenuItem();
    },

    addMedia: function() {
        var media = new Media();
        $('#content').html(new MediaView({model: media}).el);
        this.headerView.selectMenuItem('add-menu');
	},

    mediaSearch: function (id) {
        var media = new Media({_id: id});
        media.fetch({success: function(){
            $("#content").html(new SearchView({model: media}).el);
        }});
        this.headerView.selectMenuItem();
    },

    searchMedia: function() {
        var media = new Media();
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

utils.loadTemplate(['HeaderView', 'MediaView', 'SearchView', 'MediaListItemView', 'MediaListView', 'AboutView'], function() {
    app = new AppRouter();
    Backbone.history.start();
});
