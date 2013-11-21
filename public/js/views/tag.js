window.TagTransformView = function (options) {
    var self = this;
    options = options || {};
    var tagCollection;
    var model = options['model'];
    var el = options['el'] || $('#content');
    this.el = el;

    var default_type = 'tag-transform';
    var type = 'type' in options ? options['type'] : default_type;

    if(type == default_type ) {
        var transform = model.get('transform');
        if(transform) {
            transform.fetchRelated('tags');
            tagCollection = transform.get('tags');
        }
    }

    el.html(template.tag({type: type}));

    var TagItemViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            var self = this;
            kb.ViewModel.prototype.constructor.apply(this, arguments);
        }
    });

    var TagsViewModel = kb.ViewModel.extend({
        constructor: function() {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;

            this.tags =  kb.collectionObservable(tagCollection, {
                view_model: TagItemViewModel,
            });

            this.removeRelatedTag =  function (m) {
                if(m._id()) {
                    var realModel = tagCollection.get(m._id());
                    tagCollection.remove(realModel);
                    transform.save()
                } else {
                    console.warn('Id is not valid');
                }
            };

            this.addRelatedTag = function () {
                if(self.tagName()) {
                    var model = new Media.Tag({ name: self.tagName(), color: self.tagColor() });
                    model.save(
                        {},
                        {
                            success: function (m) {
                                tagCollection.add(m);
                                transform.save();
                            }
                        }
                    );
                    self.clearAddForm();
                } else {
                    console.warn('Tag Name is empty');
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
        },
        tagName:  ko.observable(''),
        tagColor: ko.observable(''),
        showAddForm: ko.observable(false),
        clearAddForm: function () {
            this.tagName('');
            this.tagColor('');
        },
    });

    ko.applyBindings(new TagsViewModel(), el[0]);

    this.destroyView = function() {
    };

    this.canNavigateAway = function(options) {
        this.destroyView();
        options["ok"]();
    };
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
