window.MediaListView = function(options){
    var self = this;

    var collection = null;

    var model = options['model'];
    this.model = model;

    var el = options['el'] || $('#content');
    this.el = el;

    this._hasChanges = false;
    this.has_dummy_row = false;
    var allow_drop = false;

    var default_pagination = 'endless';
    var pagination = 'pagination' in options ? options['pagination'] : default_pagination;

    var config = 0;
    var default_facets = appCollection.at(config).get('Search').Medias.facets;
    var facets = 'facets' in options ? options['facets'] : default_facets;

    var default_search_type = 'server';
    var search_type = 'search_type' in options ? options['search_type'] : default_search_type;
    var type = 'type' in options ? options['type'] : 'medialist-searchable-fixed';

    if (type.match(/playlist/)) {
        // In case of playlist, fetch related
        model.fetchRelated("pieces");
        collection = model.get('pieces');
    } else {
        collection = model;
    }

    if (type.match(/sortable/)){
        allow_drop = true;
        search_type = 'client';
    }

    el.html(template.medialist({type: type}));
    console.log('ML2');

    var MediaListViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;
            this.editingName = ko.observable(false);
            this.nameClick = function () {
                this.editingName(true);
            }

            this.changeFocus = function () {
                if(self.name().length<=0)
                  return false;
                self.editingName(false);
            }

            this.removeItem = function (item) {
                self.collection.remove(item);
            }

            this.filter = ko.observable('');
            this.collection =  kb.collectionObservable(collection, {
                view_model: kb.ViewModel,
                filters: function(model) {
                    var filter;
                    filter = self.filter();
                    if (!filter) return false;
                    var re = new RegExp(filter,"i");
                    return ( model.get('file').search(re) < 0 &&
                             model.get('name').search(re) < 0
                    );
                },
            });

            this.duration = kb.observable(model, 'duration');

            this.total_time = ko.computed(function(){
//XXX: keep this, it tells KO to update total_time when something happens to the model.
// For Media.Playlist we look for changes in the duration field, as the pieces may arrive with incomplete
// information when we do a fetchRelated(). We take care of that inside the model and update duration when
// everything is ready.
// If we are rendering a Media.Collection we don't have a duration attribute and so we add a dependency to
// the collection itself.
                var x = self.duration();
                if (x === null) {
                    x = self.collection();
                }
                return model.pretty_duration();
            }, model);
        },

        allowDrop: allow_drop,

        dragHandler: function(item, event, ui){
            var attrs = _.clone(item.model().attributes);
            var piece = new Media.Piece(attrs);
            piece.set('checksum', attrs['_id']);
            //HACK to create piece on collection  and keep checksum
            piece.unset('_id');
            pieceList.create(piece);
            return kb.viewModel(piece)
        },
    });

    new SearchView({
        el: $('#media-search',el),
        collection: collection,
        type: search_type,
        pagination: pagination,
        facets: facets
    });

    this.view_model = new MediaListViewModel(model);

    this.editListName = function () {
        this.view_model.editingName(true);
    };

    this.destroyView = function () {
        kb.release(this.view_model);
        ko.removeNode(this.el);
        this.el.html('');
    };

    this.deleteModel = function () {
        this.destroyView();
        var pieces = this.model.get('pieces');
        for( i=pieces.length-1; i>=0; i--) {
            pieces.at(i).destroy();
        }
        this.model.destroy();
    };

    this.save = function (newmodel) {
        if (newmodel) {
            this.view_model.model(newmodel);
            this.model = newmodel;
            newmodel.bind('change', this._model_change_cb);
        }
        this.model.save();
        this._hasChanges = false;
    };

    this.addDummyRow = function () {
        if (this.has_dummy_row) {
            return;
        }

        $("#media-view", this.el).append('<tr><td></td></tr>');
        this.has_dummy_row = true;
    };

    this.onCollectionChange = function (value) {
        if (0 == value.length){
            this.addDummyRow();
        }
    };

    this._model_change_cb = function () {
        this._hasChanges = true;
    };

    this.clearChanges = function () {
        this._hasChanges = false;
    };

    this.hasChanges = function () {
        return this.model.isNew() || this._hasChanges
    };

    _.bindAll(this, 'onCollectionChange', 'addDummyRow', 'destroyView', 'deleteModel', 'save', 'editListName', '_model_change_cb', 'clearChanges', 'hasChanges');
    this.view_model.collection.subscribe(this.onCollectionChange);
    model.bind('change', this._model_change_cb);

    ko.applyBindings(this.view_model, el[0]);

    if (0 == collection.length){
        this.addDummyRow();
    }
}

