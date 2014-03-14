window.UniverseListView = function(options){
    this.options = options;
    var draggable = 'draggable' in options ? options['draggable'] : false;
    var collection = options['collection'];
    var el = $('#content');
    if(options['el'])
        el = options['el'];

    this.collection = collection;
    this.el = el;

    var default_pagination = 'endless';
    var pagination = 'pagination' in options ? options['pagination'] : default_pagination;

    var default_search_type = 'server';
    var search_type = 'search_type' in options ? options['search_type'] : default_search_type;

    var config = 0;
    var default_facets = appCollection.at(config).get('Search').Lists.facets;
    var facets = 'facets' in options ? options['facets'] : default_facets;
    var search_title = i18n.gettext('Playlists');

    el.html(template.universe({draggable: draggable}));

    var UniItemViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            var self = this;
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            this.medias =  kb.collectionObservable(model.get('pieces'));
            this.duration = kb.observable(model, 'duration');

            this.total_time = ko.computed(function(){
                /*
                 * XXX: keep this, it tells KO to update total_time when something happens to the model.
                 * For Media.Playlist we look for changes in the duration field, as the pieces may arrive with incomplete
                 * information when we do a fetchRelated(). We take care of that inside the model and update duration when
                 * everything is ready.
                */
                var x = self.duration();
                return model.pretty_duration();
            }, model);
            this.id = ko.observable(model.id);
        },
    });

    var UniverseListViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;
            this.filter = ko.observable('');
            this.playlists =  kb.collectionObservable(collection, {
               view_model: UniItemViewModel,
               filters: function(model) {
                   var filter;
                   filter = self.filter();
                   if (!filter) return false;
                   var re = new RegExp(filter,"i");
                   return model.get('name').search(re) < 0;
               },

            });
        }
    });

    var search_options = this.options.search_options || {
        title: search_title,
        collection: collection,
        type: search_type,
        pagination: pagination,
        facets: facets,
        query: '',
    };

    this.options['search_options'] = search_options;
    search_options.el = $('#media-search', el);
    this.search_view = new SearchView(search_options);

    this.view_model = new UniverseListViewModel(this.collection);

    this.destroy = function () {
        this.search_view.destroy();
        kb.release(this.view_model);
        ko.cleanNode(this.el);
        this.el.html('');
    }

    ko.applyBindings(this.view_model, el[0]);

    if (!this.collection.models.length) {
        this.collection.fetch();
    }
}
