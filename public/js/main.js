var appCollection = new App.Collection();

window.appCollection = appCollection;
window.appstatus = new App.Status();
window.framestatus = new App.ProgressStatus();

var AppRouter = Backbone.Router.extend({
    currentView: null,
    currentHash: Backbone.history.getHash(),
    viewNames:   [],
    promises:    [],

    routes: {
        "media"             : "list",
        "media/edit"        : "editMedia",
        "playout"           : "playout",
        "schedule"          : "schedule",
        "editor"            : "editor",
        "admin"             : "conf",

        "media/:id"         : "mediaDetails",

        "universe"          : "universe",
        "media/add"         : "upload",
        "program/:id"       : "listProgram",

        "about"             : "about",
    },

    initialize: function () {
        window.socket = io.connect('http://' + window.location.hostname);
        window.socket.on('medias:moved', function (move) {
            console.log ('got medias:moved from server', move);
        });

        this.currentHash = Backbone.history.getHash();
        this.viewNames = _.toArray(this.routes);

        this.headerView = new HeaderView({appstatus: window.appstatus, framestatus: window.framestatus});

        this.on('preroute', function(route, oldidx, newidx, args) {
            // XXX: change this to .finish() when we upgrade jQuery to 1.9
            $('#content').stop(true, true);
            if (newidx > oldidx) {
                this.promises.push($('#content').toggle('slide', {direction: 'left'}).promise());
            } else {
                this.promises.push($('#content').toggle('slide', {direction: 'right'}).promise());
            }
        });

        this.on('postroute', function(route, oldidx, newidx, args) {
            if (newidx > oldidx) {
                $('#content').toggle('slide', {direction: 'right'});
            } else {
                $('#content').toggle('slide', {direction: 'left'});
            }
        });

        this.on('route', function(route) {
            menuItem = {
                playout: 'playout-menu',
                schedule: 'schedule-menu',
                editor: 'editor-menu',
                list: 'list-menu',
                mediaDetails: 'list-menu',
                upload: 'add-menu',
                addMedia: 'add-menu',
                editMedia: 'edit-menu',
                about: 'about-menu',
                conf: 'conf-menu'
            }[route];
            if (menuItem) {
                this.headerView.selectMenuItem(menuItem)
            }
        });
    },

    playout: function() {
        return new PlayoutView();
    },

    schedule: function() {
        return new ScheduleView();
    },

    list: function() {
        return new MediaListView();
    },

    universe: function () {
        var playlists = new Media.UniversePageable();
        return new UniverseListView({collection: playlists});
    },

    mediaDetails: function (id) {
        return new MediaView({id: id});
    },

    upload: function () {
        return new UploadView ({collection: appCollection});
    },

    addMedia: function() {
        var media = new Media.Model();
        return new MediaView({model: media});
    },

    editMedia: function() {
        return new EditView();
    },

    about: function () {
        if (!this.aboutView) {
            this.aboutView = new AboutView();
        }
        $('#content').html(this.aboutView.el);
        return this.aboutView
    },
    conf: function () {
        return new ConfView({collection: appCollection});
    },

    editor: function () {
        return new EditorView();
    },

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
        if (!_.isRegExp(route)) route = this._routeToRegExp(route);
        if (_.isFunction(name)) {
          callback = name;
          name = '';
        }
        if (!callback) callback = this[name];
        var router = this;
        Backbone.history.route(route, function(fragment) {
            var args = router._extractParameters(route, fragment);

            var oldidx = router.currentView && router.currentView.idx || 0;
            var newidx = router.viewNames.indexOf(name);

            var ok = function() {
                router.trigger('preroute', name, oldidx, newidx, args);
                var inner = function() {
                    if (callback) {
                        router.currentView = callback.apply(router, args);
                        if (router.currentView) {
                            router.currentView.idx = newidx;
                        }
                    }
                    router.trigger.apply(router, ['route:' + name].concat(args));
                    router.trigger('route', name, args);
                    Backbone.history.trigger('route', router, name, args);
                    router.currentHash = Backbone.history.getHash();
                    router.trigger('postroute', name, oldidx, newidx, args);

                    router.promises.splice(0, router.promises.length);
                };

                $.when.apply($, this.promises).done(inner);
            };

            var cancel = function() {
                // XXX: keep this, otherwise the browser url will point somewhere else.
                // we need to set the history fragment to the (now) previous location
                // to avoid re-creating the current view when we change the browser url.
                // router.currentHash is updated by us after a successfull route change.
                Backbone.history.fragment = router.currentHash;
                location.hash = router.currentHash;
            };

            if (router.currentView && router.currentView.canNavigateAway) {
                router.currentView.canNavigateAway({ok: ok, cancel: cancel});
            } else {
                ok();
            }
        });
        return this;
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
    app = new AppRouter();
    Backbone.history.start({pushState:true});
}});

$(document).on("click", "a[href^='/']", function(event) {
    var href, url;
    href = $(event.currentTarget).attr('href');
    if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        url = href.replace(/^\//, '').replace('\#\!\/', '');
        app.navigate(url, {trigger: true});
        return false;
    }
});
