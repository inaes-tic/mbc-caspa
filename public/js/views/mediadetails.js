window.MediaView = MasterView.extend({
    el: "#content",
    initialize: function (options) {
        // Parent initialize
        MasterView.prototype.initialize.apply(this, arguments);

        this.options = options || {};
        this.el = options.el || $('#content');
        _.bindAll(this, 'render', 'canNavigateAway');

        this.model = options.model;
        if (this.model !== undefined) {
            this.render();
        } else {
            this.model = Media.Model.findOrCreate({ _id: options.id });
            this.model.fetch({
                success: this.render,
            });
        }
    },

    render: function() {
        var self = this;
        self.el.html(template.mediaview(self.model.toJSON()));

        self.view_model = kb.viewModel(self.model);

        self.view_model.save = function(viewmodel) {
            if (viewmodel) {
                viewmodel.model().save();
            }
        };

        ko.applyBindings(self.view_model, self.el[0]);
    },

    canNavigateAway: function (options) {
        var self = this;
        kb.release(self.view_model);
        // Clear element
        ko.cleanNode(self.el[0]);
        self.el.html('');
        options['ok']();
    },
});
