window.EditView = PanelView.extend({
    el: "#content",
    events: {
        "click #create-playlist" : "createPlaylist",
        "click #universe li"     : "switchPlaylistEvent",
        "click #right-pane .kill-media-list"  : "killEditList",
        "click #right-pane .hide-alert"  : "hideAlert",
    },
    initialize: function (options) {
        // Parent initialize
        PanelView.prototype.initialize.apply(this, arguments);
        this.options = options || {};

        _.bindAll(this, 'createPlaylist', 'savePlaylist', 'delPlaylist', 'clearSearch', 'showPlaylist', 'switchPlaylist', 'onBackendEvent', 'onBackendDeleteEvent');
        this.render();
    },
    render: function () {
        $(this.el).html(template.mediaedit());

        var state = this.options['state'] || new utils.StateTracker();
        this.state = state;
        this.options.state = state;
        this.state.on('changed', this.onBackendEvent);
        this.state.on('deleted', this.onBackendDeleteEvent);

        this.collection = state.collection || new Media.UniversePageable();
        state.collection = this.collection;

        this.universe_view = new UniverseListView({
            collection: this.collection,
            el: $("#universe", this.el),
        });

        this.mediacollection = state.mediacollection || new Media.CollectionPageable();
        state.mediacollection = this.mediacollection;

        this.medialist = new MediaListView({
            model: this.mediacollection,
            el: $("#left-pane", this.el),
            type: 'medialist-draggable-fixed',
        });
        this.medialist.on('dragstart', this.clearSearch);

        var resp = state.enterView();
        if (resp.model) {
            if (resp.changed) {
                $('.alert-other-client-changed', this.el).show();
                this.showPlaylist(resp.model);
            } else {
                this.showPlaylist(resp.model, {'dont-fetch':true});
            }
        }

        // Parent render
        PanelView.prototype.render.apply(this, arguments);

        return this;
    },
    createPlaylist: function () {
        // Just in case
        this.killEditList();

        // Setting the _id here enables us to have sane relationships for new playlists.
        // On the server we turn the 'update' event to a 'create' when we find
        // the '_tmpid' so other clients are properly synchronized.
        var list = new Media.Playlist({published: false, _tmpid: true, _id: uuid.v4()});
        this.state.trackModel(list);

        this.showPlaylist(list)
    },
    killEditList: function () {
        if (this.editview) {
            this.editview.destroyView();
            this.editview = null;
        }

        this.editList = null;

        $('.playlist-button-array', this.el).hide();
        $('.no-playlist-alert', this.el).show();

        // Unbind save and delete buttons
        $(".playlist-button-array .save").unbind("click");
        $(".playlist-button-array .delete").unbind("click");
    },
    hideAlert: function (ev) {
        // we can get the div with something like $(ev.target.parentElement)
        // but sometimes there is the need to hide more than only one.
        $('.no-playlist-alert', this.el).hide();
        $('.alert-empty-playlist', this.el).hide();
        $('.alert-unnamed-playlist', this.el).hide();
        $('.alert-has-occurrences', this.el).hide();
        $('.alert-other-client-changed', this.el).hide();
        $('.alert-other-client-deleted', this.el).hide();
    },
    onBackendEvent: function () {
        // This is called when other client changes the playlist
        // we are editing.
        if (!this.editList) {
            return;
        }

        // XXX: this is required to show the elements on the correct order.
        var ps = this.editList.get('pieces').models;
        this.editList.get('pieces').reset(ps);

        $('.alert-other-client-changed', this.el).show();
    },
    onBackendDeleteEvent: function () {
        // This is called when other client deletes the playlist
        // we are editing.
        if (!this.editList) {
            return;
        }

        this.killEditList();
        this.hideAlert();
        $('.alert-other-client-deleted', this.el).show();
    },
    switchPlaylistEvent: function (event, a) {
        return this.switchPlaylist( ko.dataFor(event.currentTarget).model().id );
    },
    switchPlaylist: function (id, options) {
        if (this.editList && id == this.editList.id) {
            return;
        }
        var list = this.collection.get(id);

        this.showPlaylist(list, options);
    },
    showPlaylist: function (list, options) {
        var self = this;

        if (list === self.editList) {
            return;
        }

        self.killEditList();

        self.state.trackModel(list);

        self.editList = list;

        self.editview = new MediaListView(_.extend({
            sortable: true,
            model: list,
            el: $("#new-playlist", self.el),
            type: 'playlist-sortable',
            pagination: false,
            search_type: 'client',
        }, options));

        // Bind save and delete buttons
        $(".playlist-button-array .save").bind("click", _.bind(self.savePlaylist, self));
        $(".playlist-button-array .delete").bind("click", _.bind(self.delPlaylist, self));

        $('.alert-empty-playlist', self.el).hide();
        $('.alert-unnamed-playlist', self.el).hide();
        $('.alert-has-occurrences', this.el).hide();
        $('.no-playlist-alert',     self.el).hide();
        $('.playlist-button-array', self.el).show();

    },
    savePlaylist: function (event) {
        var self = this;

        var col = this.editview.model;

        var pieces      = col.get('pieces');
        var name        = col.get('name');
        var id          = col.get('_id');
        var occurrences = col.get('occurrences');

        console.log("i want to save", col, pieces, id);
        //$('.alert-empty-playlist', this.el).hide();
        //$('.alert-unnamed-playlist', this.el).hide();
        if (!pieces.length) {
            console.log("noooo pieces");
            $('.alert-empty-playlist', this.el).show();
            return;
        }
        if (!name) {
            console.log ("noooo ");
            this.editview.editListName();
            $('.alert-unnamed-playlist', this.el).show();
            return;
        }
        if (occurrences.length) {
            console.log ("Playlist has schedules");
            $('.alert-has-occurrences', this.el).show();
            return;
        }

        pieces.bind("sync", function() {
            if (_.every(pieces.pluck("_id"))) {
                // All pieces are stored in the DB
                pieces.off("sync");
                if (col.isNew()) {
                    console.log ("about to feed this to the universe:", col.attributes);
                    self.collection.create(col, {
                        success: function(mod) {
                            // this is called after we get the model just created with an id from the server,
                            // so we can update the view with the new model.
                            // WHY not just use the result of collection.create()?
                            // even if we set {wait: true} that model won't have an id, at least not after the 'sync'
                            // event fires when we get the response from the server, so calling .save() on that leads
                            // to duplicate (but different) playlist and all sorts of fun debugging time.
                            self.editview.save(mod);
                            self.state.trackModel(mod);
                        },
                    });
                    console.log('WE HAVE ADDED TO THE UNIVERSE', col);
                } else {
                    // if we are paginating Universe the model being edited can no longer be inside Universe
                    // so calling .save() on that fails. But, calling .create() and passing an existing model
                    // makes it to the server, updates our Universe and restores relationships. Sometimes we
                    // can have nice things after all.
                    self.collection.create(col);
                    self.state.commitChanges();
                    console.log ('universe knows of us, just saving');
                }
            }
        });

        pieces.invoke("save");

        this.editview.clearChanges();
        this.delegateEvents();
    },
    delPlaylist: function () {
        console.log ("i want to delete", this.editview.model);
        var occurrences =  this.editview.model.get('occurrences');

        $('.alert-has-occurrences', this.el).hide();
        if (occurrences.length) {
            console.log ("Playlist has schedules");
            $('.alert-has-occurrences', this.el).show();
            return;
        }

        this.editview.deleteModel();
        this.killEditList();
    },
    clearSearch: function() {
        if (this.editview) {
            this.editview.clearSearch();
        }
    },
    canNavigateAway: function (options) {
        this.state.leaveView()
        this.viewCleanup();
        options['ok']();
        return;
    },
    viewCleanup: function() {
        PanelView.prototype.destroyView.apply(this, arguments);
        this.universe_view.destroy();
        this.medialist.destroyView();
        this.killEditList();
        this.undelegateEvents();
    },
});
