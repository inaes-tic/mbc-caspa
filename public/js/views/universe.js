window.UniverseItemView = MediaListItemView.extend({
    tagName: "li",
    initialize: function () {
        MediaListItemView.prototype.initialize.call(this);
        this.collection = this.model.get('collection');
        this.model.bind("change", this.updateTotalTime, this);
    },
    render: function () {
        $(this.el).html(template.uniitem(this.model.toJSON()));
        this.updateTotalTime();
        return this;
    },
    updateTotalTime: function () {
        $('.total-time', this.el)[0].textContent = this.model.pretty_duration();
    },
});

window.UniverseListView = MediaListView.extend({
    el: $("#content"),
    get_templateHTML: function () {
        return template.universe();
    },
    get_collection: function () {
        return this.collection;
    },
    make_playlistview: function () {
        return new UniversePlayListView($.extend(this.options, {
            el: $('#playlists', this.el),
        }));
    },
    make_searchview: function () {
        return null;
    },
});

window.UniversePlayListView = MediaPlayListView.extend({
    el: $("#playlists"),
    get_collection: function () {
        return this.collection;
    },
    renderModel: function (list) {
        return new UniverseItemView({model: list}).render().el;
    },
});

window.UniverseListView2 = function(options){
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
                var x = self.medias();
                return model.pretty_duration();
            }, model);
            this.id = ko.observable(model.id);
//            this.id = ko.computed({
//                read: function(){
//                        return this.id;
//                    },
//                write: function(id){
//                        this.id = id;
//                    },
//                owner: model
//            });

        },
    });

    var UniverseListViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var _this = this;
            this.filterUniverse = ko.observable('');
            this.playlists =  kb.collectionObservable(collection, {
               view_model: UniItemViewModel,
               filters: function(model) {
                   var filter;
                   filter = _this.filterUniverse();
                   if (!filter) return false;
                   var re = new RegExp(filter,"i");
                   return model.get('name').search(re) < 0;
               },

            });
        }
    });

    this.view_model = new UniverseListViewModel(this.collection);

    this.destroy = function () {
        kb.release(this.view_model);
        ko.cleanNode(this.el);
        this.el.html('');
    }

    ko.applyBindings(this.view_model, el[0]);
}
