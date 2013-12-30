window.ConfView = function(options){
    var self = this;
    _.extend(self, Backbone.Events);

    options = options || {};
    var el = options['el'] || $('#content');
    this.el = el;

    var collection = options['collection'];

    el.html(template.confview({}));
    $('.scrollable').scrollspy('refresh');
    location.hash = location.hash+' ';

    var ConfViewModel = kb.ViewModel.extend({
        constructor: function(collection) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;

            _.extend(self, Backbone.Events);

            this.config =  kb.collectionObservable(collection, {
                view_model: kb.ViewModel,
            });

            this.save = function(item) {
                self.config()[0].model().save();
            }

            this.cancel = function() {
            }

            this.setDefault = function(idx1, idx2, idx3) {
                var m = collection.models[0].get(idx1);
                m[idx2][idx3] = collection.models[1].get(idx1)[idx2][idx3];
                collection.models[0].set(idx1, m);
                //collection.trigger('change', collection.models[0]);
            }
        },
    });

    this.view_model = new ConfViewModel(collection);
    _.extend( this.view_model, utils.widgetsViewModel);
    ko.applyBindings(this.view_model, $("#configure", el)[0]);

    this.canNavigateAway = function(options) {
        $(".scrollable").unbind("scroll"); // Disables scrollspy
        options["ok"]();
    }
};
