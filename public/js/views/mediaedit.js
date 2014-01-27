window.EditView = PanelView.extend({
    el: "#content",
    events: {
        "click #create-playlist" : "createPlaylist",
        "click #universe li"     : "switchPlaylistEvent",
        "click #right-pane .kill-media-list"  : "killEditList",
        "click #right-pane .hide-alert"  : "hideAlert",
    },
    initialize: function () {
        // Parent initialize
        PanelView.prototype.initialize.apply(this, arguments);

        _.bindAll(this, 'createPlaylist', 'savePlaylist', 'delPlaylist', 'clearSearch');
        this.render();
    },
    render: function () {
        $(this.el).html(template.mediaedit());

        this.collection = new Media.UniversePageable();
        this.universe_view = new UniverseListView({
            collection: this.collection,
            el: $("#universe"),
        });

        this.mediacollection = new Media.CollectionPageable();
        this.medialist = new MediaListView({
            model: this.mediacollection,
            el: $("#left-pane"),
            type: 'medialist-draggable-fixed',
        });
        this.medialist.on('dragstart', this.clearSearch);


        if (this.editList) {
            this.showPlaylist(this.editList);
        }

        // Parent render
        PanelView.prototype.render.apply(this, arguments);

        return this;
    },
    createPlaylist: function () {
        // Just in case
        this.killEditList();

        console.log ("re-instanciating editList");
        this.editList = new Media.Playlist({published: false});

        this.showPlaylist(this.editList)
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
    hideAlert: function () {
        $('.alert-empty-playlist', this.el).hide();
        $('.alert-unnamed-playlist', this.el).hide();
        $('.alert-has-occurrences', this.el).hide();
    },
    switchPlaylistEvent: function (event, a) {
        return this.switchPlaylist( ko.dataFor(event.currentTarget).model().id );
    },
    switchPlaylist: function (id) {
        this.killEditList();

        var plid = this.collection.get(id);
        this.showPlaylist(plid);
    },
    showPlaylist: function (list) {
        var self = this;

        self.editview = new MediaListView({
            sortable: true,
            model: list,
            el: $("#new-playlist"),
            type: 'playlist-sortable',
            pagination: false,
            search_type: 'client',
        });

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

        /*
         * Fun hacking time.
         * In models/Media.js we set up the reverse relation from Piece to Playlist
         * so when a new Piece is created somewhere else it doesn't end up tied to
         * a random playlist on the other browsers as it did before.
         *
         * This works like a charm for an already existing playlist.
         *
         * However, if we are about to save a new playlist it doesn't have an _id
         * yet, and so all the pieces are left with a null parentPlaylist.
         * This ultimately leads to them and the original playlist not being saved.
         * Well, it's worse than that. They are saved but parentPlaylist is null and on
         * the playlist 'pieces' is an array of null.
         *
         * So we first save the playlist without pieces, the server emits a 'create'
         * event and notifies everyone.
         *
         * After that, we have a playlist with an id. Then we re-add all the pieces and
         * save (again). This will correctly create the pieces and relations here and on
         * the other browsers.
         *
         * Why not just slap an uuid.v4() like the middleware would do anyway?
         * If we do that the call to isNew() returns false. Here it's no biggie but the
         * fine oiled machine that our Backbone-* stack is uses it internally, and I don't
         * really feel like messing with that. One of the most visible consecuences of it
         * is that the server broadcasts an 'update' event instead of a 'create', so the
         * other clients won't see the new playlist.
         *
         * Nowadays we are only creating playlists from here but all this sholud really go
         * inside the model. But there we don't always have a Universe (for new playlists
         * this.collection is undefined)
         */

        if (col.isNew()) {
            var orphans = _.clone(pieces.models); // It's okay as it is a shallow copy.
            self.collection.create(col, {
                success: function(mod) {
                    mod.get('pieces').add(orphans);;
                    save_model_pieces(mod);
                },
            });
        } else {
            save_model_pieces();
        }

        function save_model_pieces(mod) {
            // col is defined above.
            col = mod || col;
            var isNew = (mod != undefined);
            var pieces = col.get('pieces');
            pieces.bind("sync", function() {
                if (_.every(pieces.pluck("_id"))) {
                    // All pieces are stored in the DB
                    pieces.off("sync");
                    if (isNew) {
                        console.log ("about to feed this to the universe:", col.attributes);
                        self.collection.create(col, {
                            success: function(mod) {
                                /*
                                 * this is called after we get the model just created with an id from the server,
                                 * so we can update the view with the new model.
                                 * WHY not just use the result of collection.create()?
                                 * even if we set {wait: true} that model won't have an id, at least not after the 'sync'
                                 * event fires when we get the response from the server, so calling .save() on that leads
                                 * to duplicate (but different) playlist and all sorts of fun debugging time.
                                 */
                                self.editview.save(mod);
                            },
                        });
                        console.log('WE HAVE ADDED TO THE UNIVERSE', col);
                    } else {
                        /*
                         * if we are paginating Universe the model being edited can no longer be inside Universe
                         * so calling .save() on that fails. But, calling .create() and passing an existing model
                         * makes it to the server, updates our Universe and restores relationships. Sometimes we
                         * can have nice things after all.
                         */
                        self.collection.create(col);
                        console.log ('universe knows of us, just saving');
                    }
                }
            });
            pieces.invoke("save");
        }


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
        if (this.editview && this.editview.hasChanges()) {
            this.alert_dialog.dialog("open");
            options['cancel']();
        } else {
            this.viewCleanup();
            options['ok']();
        }
    },
    viewCleanup: function() {
        PanelView.prototype.destroyView.apply(this, arguments);
        this.universe_view.destroy();
        this.medialist.destroyView();
        this.killEditList();
        this.undelegateEvents();
    },
});
