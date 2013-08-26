window.EditView = Backbone.View.extend({
    el: '#content',
    events: {
        "click #create-playlist" : "createPlaylist",
        "click #universe li"     : "switchPlaylistEvent",
        "click #right-pane .kill-media-list"  : "killEditList",
        "click .playlist-button-array .save"  : "savePlaylist",
        "click .playlist-button-array .delete": "delPlaylist",
    },
    initialize: function () {
        _.bindAll(this, 'createPlaylist', 'savePlaylist', 'delPlaylist');
        this.render();
    },
    render: function () {
        $(this.el).removeClass("trans Pov").addClass("container-fluid no-Pov");
        $(this.el).html(template.mediaedit());

        this.collection = new Media.UniversePageable();

        new UniverseListView({
            collection: this.collection,
            el: $("#universe"),
        });
        new MediaListView({
            model: mediaList,
            el: $("#left-pane"),
            type: 'medialist-draggable-fixed',
        });
        if (this.editList)
            this.showPlaylist(this.editList);

        return this;
    },
    createPlaylist: function () {
        console.log ("re-instanciating editList");
        this.editList = new Media.Playlist({published: false});

        this.showPlaylist (this.editList)
    },
    killEditList: function () {
        this.editList = null;
        $('.playlist-button-array', this.el).hide();
        $('.no-playlist-alert', this.el).show();
    },
    switchPlaylistEvent: function (event, a) {
        return this.switchPlaylist( ko.dataFor(event.currentTarget).model().id );
    },
    switchPlaylist: function (id) {
        var plid = this.collection.get(id);
        this.showPlaylist(plid);
    },
    showPlaylist: function (list) {
        this.editview = new MediaListView({
            sortable: true,
            model: list,
            el: $("#right-pane"),
            type: 'playlist-sortable',
            pagination: false,
            search_type: 'client',
        });

        $('.alert-empty-playlist', this.el).hide();
        $('.alert-unnamed-playlist', this.el).hide();
        $('.no-playlist-alert',     this.el).hide();
        $('.playlist-button-array', this.el).show();
    },
    savePlaylist: function (event) {
        var medias = this.editview.model.get('pieces');
        var name   = this.editview.model.get('name');
        var id     = this.editview.model.get('_id');
        var occurrences = this.editview.model.get('occurrences');

        console.log ("i want to save", this.editview.model, medias, id);
        $('.alert-empty-playlist', this.el).hide();
        $('.alert-unnamed-playlist', this.el).hide();
        $('.alert-has-occurrences', this.el).hide();
        if (! medias.length) {
            console.log ("noooo medias");
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

        if (this.editview.model.isNew()) {
            console.log ("about to feed this to the universe:", this.editview.model.attributes);
            // this is called after we get the model just created with an id from the server,
            // so we can update the view with the new model.
            // WHY not just use the result of collection.create()?
            // even if we set {wait: true} that model won't have an id, at least not after the 'sync'
            // event fires when we get the response from the server, so calling .save() on that leads
            // to duplicate (but different) playlist and all sorts of fun debugging time.
            var afterSync = function(model) {
                this.editview.save(model);
            };
            afterSync = _.bind(afterSync, this);
            this.collection.create (this.editview.model, {success: afterSync});
            console.log ('WE HAVE ADDED TO THE UNIVERSE', this.editview.model);
        } else {
            this.editview.save();
            console.log ('universe knows of us, just saving');
        }
    },
    delPlaylist: function () {
        console.log ("i want to delete", this.editview.model);
        var id = this.editview.model.get('_id');
        var occurrences =  this.editview.model.get('occurrences');

        $('.alert-has-occurrences', this.el).hide();
        if (occurrences.length) {
            console.log ("Playlist has schedules");
            $('.alert-has-occurrences', this.el).show();
            return;
        }

        if (id) {
            this.editview.destroy();
            Universe.remove (id);
            this.killEditList();
        }
    },
});
