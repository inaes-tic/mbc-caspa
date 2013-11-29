window.TagTransformView = function (options) {
    var self = this;
    options = options || {};
    var tagCollection;
    var searchTagCollection = new Media.TagCollectionPageable();
    var page_size = options['page_size'] || (searchTagCollection instanceof PageableCollection)?searchTagCollection.state.pageSize:10;
    var model = options['model'];
    var el = options['el'] || $('#content');
    this.el = el;

    var default_type = 'tag-transform';
    var type = 'type' in options ? options['type'] : default_type;

    el.html(template.tag({type: type}));

    var TagItemViewModel = function(id, name, color) {
        this.id = ko.observable(id);
        this.name = ko.observable(name);
        this.color = ko.observable(color);
        this.displayName = ko.dependentObservable(function() {
            return this.name() + " [" + this.color() + "]";
        }, this);
    };

    var TagsViewModel = kb.ViewModel.extend({
        constructor: function(tagCollection, transformModel) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;

            self.tagId = ko.observable();
            this.tags =  kb.collectionObservable(tagCollection, {
            });

            this.removeRelatedTag =  function (vm) {
                if(vm._id()) {
                    var tagModel = tagCollection.get(vm._id());
                    tagCollection.remove(tagModel);
                    transformModel.save()
                    tagModel.get('transforms').remove(transformModel);
                    tagModel.save();
                } else {
                    console.warn('Id is not valid');
                }
            };

            this.addRelatedTag = function () {
                var model;

                var onSuccess = function(tagModel) {
                    tagCollection.add(tagModel);
                    transformModel.save();
                    tagModel.get('transforms').add(transformModel);
                    tagModel.save();
                };

                if(self.selectedTagId()) {
                    if(! tagCollection.get(self.selectedTagId())) {
                        var attr = { _id: self.selectedTagId(), name: self.tagName(), color: self.tagColor() };
                        //XXX if i just make new Media.Tag setting id and then fetch brakes something
                        tagCollection.create(attr, { success:  function(tagModel) {
                            transformModel.save();
                            tagModel.get('transforms').add(transformModel);
                            tagModel.save();
                        }});
                        self.clearAddForm();
                    } else {
                        console.warn('Tag is already related');
                    }
                } else {
                    if(self.tagName()) {
                        model = new Media.Tag({ name: self.tagName(), color: self.tagColor() });
                        model.save({}, { success: onSuccess });
                        self.clearAddForm();
                    } else {
                        console.warn('Tag is empty');
                    }
                }
            };

            this.notempty = ko.computed({
                read: function () {
                    return (!self.tags.length);
                }
            });

            this.toggleAddForm = function(){
                self.showAddForm(!self.showAddForm());
            };

            this.selectedTagId = ko.computed({
                read: function() {
                    return self.tagId();
                },

                write: function(view_model) {
                    var _id = view_model ? view_model.id() : null;
                    self.tagId(_id);
                    if (!view_model) {
                        return;
                    }

                    var m = searchTagCollection.get(_id);
                    if (m) {
                        self.tagColor(m.get('color'));
                        self.tagName(m.get('name'));
                    } else {
                        self.tagColor(view_model.color());
                        self.tagName(view_model.name());
                    }
                },
            }, self);
        },
        tagName:  ko.observable(''),
        tagColor: ko.observable(''),
        showAddForm: ko.observable(false),
        clearAddForm: function () {
            this.tagName('');
            this.tagColor('');
            $('.tag-input', this.el).val('');
        },
        tagsName: ko.observableArray(),
        getServerTags:  function (searchTerm, sourceArray) {
            var result = [];
            query_obj = { text : searchTerm };
            searchTagCollection.setQuery(query_obj, page_size);
            searchTagCollection.fetch({
                success: function() {
                    _.map(
                        searchTagCollection.toJSON(),
                        function(model) {
                            result.push(new TagItemViewModel(model._id, model.name, model.color));
                        }
                    );
                    if (result.length == 0) {
                        result.push(new TagItemViewModel(null, searchTerm, ''));
                    }
                    sourceArray(result);
                }
            });
        },
    });

    this.destroyView = function() {
    };

    this.canNavigateAway = function(options) {
        this.destroyView();
        options["ok"]();
    };

    if(type == default_type ) {
        var def_t = model.fetchRelated('transform');
        $.when.apply($, def_t).done(function(){
            var transformModel = model.get('transform');
            if(transformModel) {
                var def = transformModel.fetchRelated('tags');
                $.when.apply($, def).done(function(){
                    tagCollection = transformModel.get('tags');
                    ko.applyBindings(new TagsViewModel(tagCollection, transformModel), el[0]);
                });
            }
        });
    }

};

window.TagView = function(options){
    var self = this;
    options = options || {};
    var model = options['model'];
    var el = options['el'] || $('#content');
    this.el = el;

    var default_type = 'tag-transform';
    var type = 'type' in options ? options['type'] : default_type;

    var default_pagination = 'endless';
    var pagination = 'pagination' in options ? options['pagination'] : default_pagination;

    var config = 0;
    var default_facets = appCollection.at(config).get('Search').Tags.facets;
    var fulltext_fields = appCollection.at(config).get('Search').Tags.fulltext;
    var facets = 'facets' in options ? options['facets'] : default_facets;

    var default_search_type = 'server';
    var search_type = 'search_type' in options ? options['search_type'] : default_search_type;

    el.html(template.tag({type: type}));

    var tagCollection = new Media.TagCollectionPageable();
//    var tagCollection = new Media.TagCollection();
    tagCollection.fetch();

    var TagItemViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            var self = this;
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            this.tagEditName = ko.observable('');
            this.tagEditColor = ko.observable('');
            this.showEditForm = ko.observable(false);
        }
    });

    var TagsViewModel = kb.ViewModel.extend({
        constructor: function() {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;

            this.tags =  kb.collectionObservable(tagCollection, {
                view_model: TagItemViewModel,
            });

            this.notempty = ko.computed({
                read: function () {
                    return (!self.tags.length);
                }
            });

            this.setTag = function (m) {
                if(m.showEditForm() == false) {
                    m.showEditForm(true);
                    m.tagEditName(m.name());
                    m.tagEditColor(m.color());
                } else {
                    m.showEditForm(false);
                }
            };

            this.removeTag=  function (m) {
                //XXX Still need to check if used/associated
                var realModel = tagCollection.get(m._id());
                tagCollection.remove(realModel);
                realModel.destroy();
            };

            this.editTag = function(m) {
                var realModel = tagCollection.get(m._id());
                realModel.save({ name: m.tagEditName(), color: m.tagEditColor() });
                m.showEditForm(false);
            };

            this.addTag = function () {
                var model = new Media.Tag({ name: self.tagName(), color: self.tagColor() });
                model.save(
                    {},
                    { success: function (m) {
                        tagCollection.add(m);  }
                    }
                );
                self.clearAddForm();
            };
        },
        tagName:  ko.observable(''),
        tagColor: ko.observable(''),
        showAddForm: ko.observable(true),
        clearAddForm: function () {
            this.tagName('');
            this.tagColor('');
        },
    });


    ko.applyBindings(new TagsViewModel(), el[0]);

    this.search_view = new SearchView({
        el: $('#tag-search', el),
        collection: tagCollection,
        type: search_type,
        pagination: pagination,
        facets: facets
    });

    this.destroyView = function() {
    };


    this.canNavigateAway = function(options) {
        this.destroyView();
        options["ok"]();
    };
};
