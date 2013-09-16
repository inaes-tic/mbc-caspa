window.MediaListView = function(options){
    var self = this;
    _.extend(self, Backbone.Events);

    options = options || {};

    var pieceList = options['pieceList'] || new Media.PieceCollection();

    var model = options['model'];

    var el = options['el'] || $('#content');
    this.el = el;

    this._hasChanges = false;
    var allow_drop = false;

    var default_pagination = 'endless';
    var pagination = 'pagination' in options ? options['pagination'] : default_pagination;

    var config = 0;
    var default_facets = appCollection.at(config).get('Search').Medias.facets;
    var fulltext_fields = appCollection.at(config).get('Search').Medias.fulltext;
    var facets = 'facets' in options ? options['facets'] : default_facets;

    var default_search_type = 'server';
    var search_type = 'search_type' in options ? options['search_type'] : default_search_type;
    var type = 'type' in options ? options['type'] : 'medialist-searchable-fixed';

    var collection;
    if (type.match(/playlist/)) {
        // In case of playlist, fetch related
        if (!model.isNew()) {
            model.fetchRelated("pieces");
            model.fetchRelated("occurrences");
            model.fetch();
        }
        collection = model.get('pieces');
    } else {
        if (model !== undefined) {
            // Use provided model
            collection = model;
        } else {
            // Or use default collection type
            collection = new Media.CollectionPageable();
            model = collection;
        }
        collection.fetch();
    }

    this.model = model;

    if (type.match(/sortable/)){
        allow_drop = true;
        search_type = 'client';
    }

    el.html(template.medialist({type: type}));

    $("#media-view", el).on("dragstart", function() {
        self.trigger('dragstart')
    });

    $("#media-view", el).on("dragstop", function() {
        self.trigger('dragstop')
    });

    var MediaListViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;
            _.extend(self, Backbone.Events);

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


            this.__filters = ko.observable();
            this.filter = ko.computed({
                read: function() {
                    return self.__filters();
                },
                write: function(query) {
                    filters = [];
                    if (!query) {
                        self.collection.filters(filters);
                        self.__filters(filters);
                        return;
                    }
                    var deep_get = function(model, prop) {
                        var value = '';
                        attrs = prop.split(".");
                        value = model.get(attrs.shift());
                        while (attrs.length) {
                            value = value[attrs.shift()];
                        }
                        return value;
                    }
                    _.each(query, function(target, prop) {
                        var flt = function(model) {
                            var re = new RegExp(target, "i");
                            if (prop != "text") {
                                value = deep_get(model, prop);
                                // returning true here tells KO to skip that model from the display list.
                                return String(value).search(re) < 0;
                            } else {
                                var fields = _.clone(fulltext_fields);
                                var results = [];
                                while (fields.length) {
                                    value = deep_get(model, fields.shift());
                                    results.push( String(value).search(re) < 0 );
                                }
                                return _.every(results);
                            }
                        }
                        filters.push(flt);
                    });
                    self.__filters(query);
                    self.collection.filters(filters);
                },
            });
            this.collection =  kb.collectionObservable(collection, {
                view_model: kb.ViewModel,
            });
            collection.bind('filter', self.filter);

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

        allowDrop: ko.observable(allow_drop),

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

    this.search_view = new SearchView({
        el: $('#media-search',el),
        collection: collection,
        type: search_type,
        pagination: pagination,
        facets: facets
    });

    if (type.match(/playlist/)) {
        self.search_view.on('doSearch', function(query) {
            if (!_.isEmpty(query)) {
                $('#media-view', self.el).sortable('disable')
            } else {
                $('#media-view', self.el).sortable('enable')
            }
        });

        self.search_view.on('clearSearch', function() {
            $('#media-view', self.el).sortable('enable')
        });
    }

    this.view_model = new MediaListViewModel(model);


    this.searchFilter = this.view_model.filter;

    this.editListName = function () {
        this.view_model.editingName(true);
    };

    this.releaseView = function() {
        // Release resources
        collection.off("filter");
        this.model.off("change");
        this.search_view.destroy();
        kb.release(this.view_model);
    };

    this.removeView = function() {
        // Clear element
        ko.removeNode(this.el);
        this.el.html('');
    };

    this.destroyView = function() {
        this.releaseView();
        this.removeView();
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
        var container = $("#media-view", this.el);
        if ($(".dummy-row", container).length) {
            return;
        }
        container.append('<tr class="dummy-row"><td></td></tr>');
    };

    this.removeDummyRow = function () {
        var container = $("#media-view", this.el);
        var dummy = $(".dummy-row", container);
        dummy.remove()
    };

    this.onCollectionChange = function (value) {
        if (0 == value.length){
            this.addDummyRow();
        } else {
            this.removeDummyRow();
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

    _.bindAll(this, 'onCollectionChange', 'addDummyRow', 'removeDummyRow', 'destroyView', 'deleteModel', 'save', 'editListName', '_model_change_cb', 'clearChanges', 'hasChanges');
    this.view_model.collection.subscribe(this.onCollectionChange);
    model.bind('change', this._model_change_cb);

    ko.applyBindings(this.view_model, el[0]);

    if (0 == collection.length){
        this.addDummyRow();
    }

    this.canNavigateAway = function(options) {
        this.destroyView();
        options["ok"]();
    };
}

