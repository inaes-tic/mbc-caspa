window.UniverseListView = function(options){
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

    el.html(template.universe({draggable: draggable}));
    console.log('UV2');

    var UniItemViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            var self = this;
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            options = options || {};
            options['keys'] = ['collection', 'name'];
            this.medias =  kb.collectionObservable(model.get('collection'));
            this.total_time = ko.computed(function(){
//XXX: keep this, it tells KO to update total_time when something happens to the collection
                var x = self.medias();
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

    new SearchView({
        el: $('#playlist-search',el),
        collection: this.collection,
        type: search_type,
        pagination: pagination
    });

    this.view_model = new UniverseListViewModel(this.collection);

    this.destroy = function () {
        kb.release(this.view_model);
        ko.cleanNode(this.el);
        this.el.html('');
    }

    ko.applyBindings(this.view_model, el[0]);
}
