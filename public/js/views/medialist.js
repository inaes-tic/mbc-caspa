window.MediaListView  = MasterView.extend({
    el: "#content",
    initialize: function(options){
        MasterView.prototype.initialize.apply(this, arguments);
        var self = this;

        options = options || {};
        self.options = options;

        var model = options['model'];

        var el = options['el'] || $('#content');
        this.el = el;

        var type = 'type' in options ? options['type'] : 'medialist-searchable-fixed';

        var collection;
        if (type.match(/playlist/)) {
            // In case of playlist, fetch related
            if (!model.isNew() && !options['dont-fetch']) {
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

            if (!collection.models.length) {
                collection.fetch();
            }
        }

        this.model = model;
        this.options.model = model;
        this.collection = collection;

        this.render();
    },

    render: function (options) {
        var self = this;
        var options = options || this.options;

        var allow_drop = false;
        var type = options.type;
        var el = this.el;

        var collection = this.collection;
        var model = this.model;

        var default_pagination = 'endless';
        var pagination = 'pagination' in options ? options['pagination'] : default_pagination;
        self.options.pagination = pagination;

        var config = 0;
        var default_facets = appCollection.at(config).get('Search').Medias.facets;
        var fulltext_fields = appCollection.at(config).get('Search').Medias.fulltext;
        var facets = 'facets' in options ? options['facets'] : default_facets;
        self.options.facets = facets;

        var default_search_type = 'server';
        var search_type = 'search_type' in options ? options['search_type'] : default_search_type;
        var type = 'type' in options ? options['type'] : 'medialist-searchable-fixed';

        self.options.search_type = search_type;
        self.options.type = type;

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

                _.bindAll(this, "afterMove", "dragHandler");
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
                    var filters = self.filter();
                    self.filter(null);
                    self.collection.remove(item);
                    self.filter(filters);
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

                this.playlist_or_notempty = ko.computed({
                    read: function () {
                        return (!self.collection.length || type.match(/playlist/));
                    }
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

            allowDrop: ko.observable(allow_drop),

            dragHandler: function(item, event, ui){
                // Instantiate drag element as Media.Piece
                var attrs = _.clone(item.model().attributes);
                var piece = new Media.Piece(attrs);
                piece.set('checksum', attrs['_id']);
                piece.unset('_id');
                return kb.viewModel(piece)
            },

            afterMove: function(arg, event, ui) {
                var pieces = this.model().get("pieces");
                var model = arg.item.model();
                if (model.isNew()) {
                    pieces.add(model, {at: arg.targetIndex});
                }
            },
        });

        search_options = {
            collection: collection,
            type: search_type,
            pagination: pagination,
            facets: facets,
            query: '',
        };

        this.options['search_options'] = search_options;
        search_options.el = $('#media-search',el);


        this.search_view = new SearchView(search_options);

        this.view_model = new MediaListViewModel(model);


        this.searchFilter = this.view_model.filter;

        this.editListName = function () {
            this.view_model.editingName(true);
        };

        this.deleteModel = function () {
            this.destroyView();
            var pieces = this.model.get('pieces');
            for( i=pieces.length-1; i>=0; i--) {
                pieces.at(i).destroy();
            }
            this.model.destroy();
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

        _.bindAll(this, 'onCollectionChange', 'addDummyRow', 'removeDummyRow', 'destroyView', 'deleteModel', 'save', 'editListName', '_model_change_cb', 'clearChanges', 'hasChanges', '_bindModel', '_unbindModel');
        this.view_model.collection.subscribe(this.onCollectionChange);
        this._bindModel(model);

        ko.applyBindings(this.view_model, el[0]);

        if (0 == collection.length){
            this.addDummyRow();
        }

    },

    clearSearch: function () {
        this.search_view.clearSearch();
    },

    _unbindModel: function(model) {
        model.off('change', this._model_change_cb);
        model.off('reset:pieces', this._model_change_cb);
        model.off('backend', this.clearChanges);
    },

    _bindModel: function(model) {
        model.on('change', this._model_change_cb);
        model.on('reset:pieces', this._model_change_cb);
        model.on('backend', this.clearChanges);
    },

    clearChanges: function () {
        this._hasChanges = false;
    },

    hasChanges: function () {
        return this.model.isNew() || this._hasChanges
    },

    save: function (newmodel) {
        if (newmodel) {
            self._unbindModel(this.model);
            this.view_model.model(newmodel);
            this.model = newmodel;
            self._bindModel(newmodel);
        }
        this.model.save();
        this.clearChanges();
    },

    releaseView: function() {
        // Release resources
        this.collection.off("filter");
        this._unbindModel(this.model);
        this.search_view.destroy();
        kb.release(this.view_model);
    },

    removeView: function() {
        // Clear element
        ko.cleanNode(this.el[0]);
        this.el.html('');
    },

    destroyView: function() {
        this.releaseView();
        this.removeView();
    },

    canNavigateAway: function(options) {
        this.destroyView();
        options["ok"]();
    },
});
