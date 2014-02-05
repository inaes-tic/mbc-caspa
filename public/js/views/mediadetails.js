window.MediaView = function (options) {
    var self = this;
    options = options || {};

    this.el = $('#content');

    this.render = function() {
        self.el.html(template.mediaview(self.model.toJSON()));

        self.view_model = kb.viewModel(self.model);

        self.view_model.save = function(viewmodel) {
            if (viewmodel) {
                viewmodel.model().save();
            }
        };

        ko.applyBindings(self.view_model, self.el[0]);
    }

    this.model = options['model'];
    if (this.model !== undefined) {
        this.render();
    } else {
        this.model = Media.Model.findOrCreate({ _id: options["id"], });
        this.model.fetch({
            success: this.render,
        });
    }

    this.canNavigateAway = function (options) {
        kb.release(self.view_model);
        // Clear element
        ko.cleanNode(self.el[0]);
        self.el.html('');
        options['ok']();
    };
}

