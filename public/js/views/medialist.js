window.MediaListView = function(options){
    var self = this;

    var model = options['model'];
    var collection = model.get('collection');
    var el = options.el || $('#content');

    this.model = model;
    this.el = el;
    this.has_dummy_row = false;

    var allow_drop = false;
    var type = 'type' in options ? options['type'] : 'playlist-searchable-fixed';

    if (type.match(/sortable/)){
        allow_drop = true;
    }

    el.html(template.medialist({type: type}));

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

    new SearchView({el: $('#media-search',el), type: 'media' });
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

    this.onChange = ko.observable();
    this._onChange = function() {
        if (this._onChange.paused){ return; }
        this.onChange.notifySubscribers();
    };
    this._onChange.paused = false;

    this.save = _.debounce(function (newmodel) {
        if (newmodel) {
            this.view_model.model(newmodel);
            this.model = newmodel;
        }
        this._onChange.paused = true;
        var done =  _.bind(function(){ this._onChange.paused = false; }, this);
        var xhr = this.model.save();
        if (xhr) {
            xhr.done(done);
        } else {
            //falla de validacion o no hubo cambios.
            done();
        }
    }, 100);

    _.bindAll(this, '_onChange', 'onCollectionChange', 'addDummyRow', 'destroy', 'save', 'editListName');
    this.view_model.collection.subscribe(this.onCollectionChange);
    this.view_model.collection.subscribe(this._onChange);
    this.view_model.editingName.subscribe(function(value){ if (!value){ self._onChange() } });

    this.view_model.collection.subscribe(this.onCollectionChange);

    ko.applyBindings(this.view_model, el[0]);

    if (0 == collection.length){
        this.addDummyRow();
    }
}

