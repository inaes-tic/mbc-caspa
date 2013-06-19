window.MediaListView = function(options){
    var self = this;

    var model = options['model'];
    var collection = null;

    var el = $('#content');
    if(options['el'])
        el = options['el'];

    this.model = model;
    this.el = el;
    this.has_dummy_row = false;

    var allow_drop = false;
    var type = 'type' in options ? options['type'] : 'medialist-searchable-fixed';

    if (type.match(/playlist/)) {
        collection = model.get('pieces');
    } else {
        collection = model;
    }

    if (type.match(/sortable/)){
        allow_drop = true;
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

            this.filter = ko.observable('');
            this.collection =  kb.collectionObservable(collection, {
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
            //HACK to create piece on collection  and keep checksum
            piece.unset('_id');
            pieceList.create(piece);
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
        var pieces = this.model.get('pieces');
        for( i=pieces.length-1; i>=0; i--) {
            pieces.at(i).destroy();
        }
        this.model.destroy();
        ko.cleanNode(this.el);
        this.el.html('');
    };

    this.logicDestroy = function() {
        var is_deleted = {is_deleted: true};
        kb.release(this.view_model);
        var pieces = this.model.get('pieces');
        for( i=pieces.length-1; i>=0; i--) {
            pieces.at(i).save(is_deleted);
        }
        this.model.save(is_deleted);
        ko.cleanNode(this.el);
        this.el.html('');
    }

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

