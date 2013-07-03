window.MediaListView = function(options){
    var self = this;

    var model = options['model'];
    var collection = model.get('collection');
    var el = $('#content');
    if(options['el'])
        el = options['el'];

    this.model = model;
    this.el = el;
    this.has_dummy_row = false;

    var allow_drop = false;

    var default_type = 'playlist-searchable-fixed';
    var type = 'type' in options ? options['type'] : default_type;

    var default_pagination = 'endless';
    var pagination = 'pagination' in options ? options['pagination'] : default_pagination;

    var config = 0;
    var default_facets = appCollection.at(config).get('Search').Medias.facets;
    var facets = 'facets' in options ? options['facets'] : default_facets;

    var default_search_type = 'server';
    var search_type = 'search_type' in options ? options['search_type'] : default_search_type;

    if (type.match(/sortable/)){
        allow_drop = true;
        search_type = 'client';
    }

    el.removeClass("trans Pov").addClass("container-fluid no-Pov");
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
            this.collection =  kb.collectionObservable( model.get('collection'), {
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

            this.total_time = ko.computed(function(){
//XXX: keep this, it tells KO to update total_time when something happens to the collection
                var x = self.collection();
                return model.pretty_duration();
            }, model);
        },

        allowDrop: allow_drop,

        dragHandler: function(item, event, ui){
            var attrs = _.clone(item.model().attributes);
            var piece = new Media.Piece(attrs);
            piece.set('checksum', attrs['_id']);
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

    this.destroy = function () {
        kb.release(this.view_model);
        this.model.destroy();
        ko.cleanNode(this.el);
        this.el.html('');
    };

    this.save = function (newmodel) {
        if (newmodel) {
            this.view_model.model(newmodel);
            this.model = newmodel;
        }
        this.model.save();
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

    _.bindAll(this, 'onCollectionChange', 'addDummyRow', 'destroy', 'save', 'editListName');
    this.view_model.collection.subscribe(this.onCollectionChange);

    ko.applyBindings(this.view_model, el[0]);

    if (0 == collection.length){
        this.addDummyRow();
    }
}

