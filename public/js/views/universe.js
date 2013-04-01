window.UniverseListView = function(options){
    var draggable = 'draggable' in options ? options['draggable'] : false;
    var collection = options['collection'];
    var el = $('#content');
    if(options['el'])
        el = options['el'];

    this.collection = collection;
    this.el = el;

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
            var _this = this;
            this.filter = ko.observable('');
            this.playlists =  kb.collectionObservable(collection, {
               view_model: UniItemViewModel,
               filters: function(model) {
                   var filter;
                   filter = _this.filter();
                   if (!filter) return false;
                   var re = new RegExp(filter,"i");
                   return model.get('name').search(re) < 0;
               },

            });

            this._onClick = function (item) {
                if (_this.onClick) {
                    return _this.onClick(item);
                }
                return true;
            };
        }
    });

    new SearchView({el: $('#playlist-search',el), type: 'playlist' });
    this.view_model = new UniverseListViewModel(this.collection);

    this.destroy = function () {
        kb.release(this.view_model);
        ko.cleanNode(this.el);
        this.el.html('');
    };

    var _this = this;
    this._onClick = function (item) {
        console.log('outer click');
        if (_this.onClick) {
            return _this.onClick(item);
        }
        return true;
    };

    this.view_model.onClick = this._onClick;
    ko.applyBindings(this.view_model, el[0]);
}
