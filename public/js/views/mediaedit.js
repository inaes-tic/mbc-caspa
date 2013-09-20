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
        this.releaseEditList();

        if (this.editview) {
            this.editview.removeView();
            this.editview = null;
        }

        $('.playlist-button-array', this.el).hide();
        $('.no-playlist-alert', this.el).show();
    },
    releaseEditList: function() {
        this.editList = null;

        if (this.editview) {
            this.editview.releaseView();
        }

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
        this.releaseEditList();

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
                        },
                    });
                    console.log('WE HAVE ADDED TO THE UNIVERSE', col);
                } else {
                    // if we are paginating Universe the model being edited can no longer be inside Universe
                    // so calling .save() on that fails. But, calling .create() and passing an existing model
                    // makes it to the server, updates our Universe and restores relationships. Sometimes we
                    // can have nice things after all.
                    self.collection.create(col);
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
