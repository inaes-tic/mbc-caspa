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
        $(this.el).html(template.mediaedit());
        new UniverseListView2({
            collection: this.collection,
            el: $("#universe")});
        new MediaListView2({
            model: mediaDB,
            el: $("#left-pane"),
            type: 'playlist-draggable',
        });
        if (this.editList)
            this.showPlaylist(this.editList);

        return this;
    },
    createPlaylist: function () {
        console.log ("re-instanciating editList");
        this.editList = new Media.List({published: false});

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
        console.log ('switching to', id, '--', plid);
        this.showPlaylist (plid);
    },
    showPlaylist: function (list) {
        console.log ('show edit view', list);
        this.editview = new MediaListView2({
            is_playlist: true,
            model: list,
            el: $("#right-pane"),
            type: 'playlist-sortable',
        });

        console.log ('show edit view', this.editview, list);

        $('.alert-empty-playlist', this.el).hide();
        $('.alert-unnamed-playlist', this.el).hide();
        $('.no-playlist-alert',     this.el).hide();
        $('.playlist-button-array', this.el).show();
    },
    savePlaylist: function (event) {
        var medias = this.editview.model.get('models');
        var name   = this.editview.model.get('name');
        var id     = this.editview.model.get('_id');

        console.log ("i want to save", this.editview.model, medias, id);
        $('.alert-empty-playlist', this.el).hide();
        $('.alert-unnamed-playlist', this.el).hide();
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

        if (this.editview.model == this.editList) {
            console.log ("about to feed this to the universe:", this.editview.model.attributes);
//XXX: ugly hack para que actualice el view_model con el objeto nuevo
            var m = this.collection.create (this.editview.model.attributes);
            this.showPlaylist(m);
            console.log ('WE HAVE ADDED TO THE UNIVERSE', this.editview.model);
        } else {
            this.editview.model.save();
            console.log ('universe knows of us, just saving');
        }
    },
    delPlaylist: function () {
        console.log ("i want to delete", this.editview.model);
        var id = this.editview.model.get('_id');
        if (id) {
            this.editview.destroy();
            Universe.remove (id);
            this.killEditList();
        }
    },
});
