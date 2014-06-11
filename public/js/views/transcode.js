window.TranscodeView = MasterView.extend({
    el: "#content",
    initialize: function (options) {
        // Parent initialize
        MasterView.prototype.initialize.apply(this, arguments);

        var self = this;
        _.extend(self, Backbone.Events);
        _.bindAll(this, 'render', 'releaseView', 'removeView', 'destroyView', 'canNavigateAway');

        options = options || {};
        this.options = options;

        var el = options['el'] || $('#content');
        this.el = el;

        this.render();
    },

    render: function () {
        var collection;
        collection = this.options.collection || new App.TranscodeProgressCollection();
        if (!this.options.collection) {
            collection.fetch();
            this.options.collection = collection;
        }
        this.collection = collection;

        this.el.html(template.transcode());


        var TranscodeQueueViewModel = kb.ViewModel.extend({
            constructor: function(model) {
                kb.ViewModel.prototype.constructor.apply(this, arguments);
                var self = this;

                this.collection =  kb.collectionObservable(model, {
                    view_model: kb.ViewModel,
                });

                //this.collection.sortAttribute('stage');
            },
        });

        this.working = new TranscodeQueueViewModel(this.collection);
        this.queued = new TranscodeQueueViewModel(this.collection);
        this.failed = new TranscodeQueueViewModel(this.collection);

        this.working.collection.filters(function(model) {
            return model.get('stage').match('^processing$|moving');
        });

        this.queued.collection.filters(function(model) {
            return model.get('stage').match('queued');
        });

        this.failed.collection.filters(function(model) {
            return model.get('stage').match('processing-error');
        });

        this.view_model = {
            Working: this.working,
            Queued:  this.queued,
            Failed:  this.failed,
        };

        ko.applyBindings(this.view_model, this.el[0]);

        // Parent render
        PanelView.prototype.render.apply(this, arguments);
    },

    releaseView: function() {
        // Release resources
        kb.release(this.view_model);
    },

    removeView: function() {
        // Clear element
        ko.cleanNode(this.el[0]);
        this.el.html('');
    },

    destroyView: function() {
        this.releaseView();
        this.removeView();
    },

    canNavigateAway: function(options) {
        this.destroyView();
        options["ok"]();
    },
});
