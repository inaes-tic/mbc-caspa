window.EditView = function(options) {
    var self = this;

    self.collection = options['collection'];
    self.el = options.el || $('#content');
    self.editview = undefined;

    $(self.el).html(template.mediaedit());
    new UniverseListView({
        collection: self.collection,
        el: $("#universe")});
    new MediaListView({
        model: mediaDB,
        el: $("#left-pane", self.el),
        type: 'playlist-draggable-fixed',
    });


    self.killEditList = function () {
        $("#right-pane", self.el).html('');
        $('.playlist-button-array', self.el).hide();
        $('.no-playlist-alert', self.el).show();
    };

    self.createPlaylist = function () {
        console.log ("re-instanciating editList");
        self.editList = new Media.List({published: false});

        self.showPlaylist (self.editList)
    };

    self.showPlaylist = function (list) {
        console.log ('show edit view', list);
        self.editview = new MediaListView({
            model: list,
            el: $("#right-pane", self.el),
            type: 'playlist-sortable',
        });
        console.log ('show edit view', self.editview, list);

        $('.alert-empty-playlist', self.el).hide();
        $('.alert-unnamed-playlist', self.el).hide();
        $('.no-playlist-alert',     self.el).hide();
        $('.playlist-button-array', self.el).show();
    };

    self.switchPlaylistEvent = function (event, a) {
        return self.showPlaylist( ko.dataFor(event.currentTarget).model() );
    };

    self.delPlaylist = function () {
        console.log ("i want to delete", self.editview.model);
        var id = self.editview.model.get('_id');
        if (id) {
            self.editview.destroy();
            Universe.remove (id);
            self.killEditList();
        }
    };

    self.savePlaylist = function (event) {
        var medias = self.editview.model.get('models');
        var name   = self.editview.model.get('name');
        var id     = self.editview.model.get('_id');

        console.log ("i want to save", self.editview.model, medias, id);
        $('.alert-empty-playlist', self.el).hide();
        $('.alert-unnamed-playlist', self.el).hide();
        if (! medias.length) {
            console.log ("noooo medias");
            $('.alert-empty-playlist', self.el).show();
            return;
        }
        if (!name) {
            console.log ("noooo ");
            self.editview.editListName();
            $('.alert-unnamed-playlist', self.el).show();
            return;
        }

        if (self.editview.model.isNew()) {
            console.log ("about to feed self to the universe:", self.editview.model.attributes);
            // this is called after we get the model just created with an id from the server,
            // so we can update the view with the new model.
            // WHY not just use the result of collection.create()?
            // even if we set {wait: true} that model won't have an id, at least not after the 'sync'
            // event fires when we get the response from the server, so calling .save() on that leads
            // to duplicate (but different) playlist and all sorts of fun debugging time.
            var afterSync = function(model) {
                self.editview.save(model);
            };
            afterSync = _.bind(afterSync, self);
            self.collection.create (self.editview.model.attributes, {success: afterSync});
            console.log ('WE HAVE ADDED TO THE UNIVERSE', self.editview.model);
        } else {
            self.editview.save();
            console.log ('universe knows of us, just saving');
        }
    };

    $("#universe").on("click", "li", self.switchPlaylistEvent);
    $(".playlist-button-array", self.el).on("click", ".save", self.savePlaylist);
    $(".playlist-button-array", self.el).on("click", ".delete", self.delPlaylist);
    $("#create-playlist", self.el).on("click", self.createPlaylist);
    $("#right-pane", self.el).on("click", ".kill-media-list",  self.killEditList);

};
