window.ConfView = function(options){
    var self = this;
    _.extend(self, Backbone.Events);

    options = options || {};
    var el = options['el'] || $('#content');
    this.el = el;

    var orig_collection = options['collection'];
    var collection;

    var models = _.pluck(orig_collection.models, 'attributes');
    collection = new App.RelationalConfig(flatten_conf(models[0], models[1], models[2]));

    el.html(template.confview({}));
    location.hash = location.hash+' ';

    var ConfViewModel = kb.ViewModel.extend({
        constructor: function(collection) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;

            _.extend(self, Backbone.Events);

            this.setDefault = function(vm, jqe) {
                vm.value(vm.default())
            },

            this.save = function(item) {
                self.trigger('save');
            }

            this.cancel = function() {
                // FIXME: implement undo here. memento?
                // we can also save the result of flatten_conf() and do a .set() with that,
                // which is basically what would memento do.
                console.log('[STUBBED] CONF: cancel() args: ', arguments);
            }

        },
        factories: {
            'properties.models': ConfViewModel,
        },
    });

    this.view_model = new ConfViewModel(collection);
    ko.applyBindings(this.view_model, $("#configure", el)[0]);

    $('.scrollable').scrollspy('refresh');

    this._save = function() {
        var js = relational_to_server_conf(collection.toJSON());
        orig_collection.models[0].set(js);
        orig_collection.models[0].save();
    };
    this.view_model.on('save', this._save);

    this.canNavigateAway = function(options) {
        $(".scrollable").unbind("scroll"); // Disables scrollspy
        options["ok"]();
    };
};

