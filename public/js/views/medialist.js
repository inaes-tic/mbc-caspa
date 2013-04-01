window.MediaListView = function(options){
    var model = options['model'];
    var collection = model.get('collection');
    var el = $('#content');
    if(options['el'])
        el = options['el'];

    this.model = model;
    this.el = el;

    var allow_drop = false;

    var type = '';

    if('type' in options){
        type = options['type'];
    }
    if( !type.match(/playlist-(searchable|draggable|sortable|readonly)/) ){
        type = 'playlist-searchable';
    }

    switch(type) {
        case "playlist-sortable":
            allow_drop = true;
            break;
        case "playlist-draggable":
        case "playlist-searchable":
        case "playlist-readonly":
        default:
            break;
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

            this.trash = ko.observable('');
            this.trash.id = "trash"; 

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
    });

    new SearchView({el: $('#media-search',el) });
    this.view_model = new MediaListViewModel(model);

    this.editListName = function () {
        this.view_model.editingName(true);
    };

    this.destroy = function () {
        kb.release(this.view_model);
        this.model.destroy();
        ko.cleanNode(this.el);
        this.el.html('');
    }

    ko.applyBindings(this.view_model, el[0]);
}
