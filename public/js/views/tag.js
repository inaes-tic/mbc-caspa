window.TagView = function(options){
    var self = this;
    options = options || {};
    var model = options['model'];
    var el = options['el'] || $('#content');
    this.el = el;

    el.html(template.tag({}));

//    var tagCollection = new Media.TagCollectionPageable();
    var tagCollection = new Media.TagCollection();
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

    this.destroyView = function() {
    };


    this.canNavigateAway = function(options) {
        this.destroyView();
        options["ok"]();
    };

};
