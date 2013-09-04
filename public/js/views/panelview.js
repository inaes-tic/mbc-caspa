window.PanelView = MasterView.extend({
    el: "#content",

    genericEvents: {
        "click .toggle-panel": "toggleSide",
    },

    initialize: function(target) {
        // This allows the view to be extended without losing bindings
        this.events = _.extend({}, this.events, this.genericEvents);
        this.delegateEvents();

        // Parent initialize
        MasterView.prototype.initialize.apply(this, arguments);
    },

    render: function() {
        // Parent render
        MasterView.prototype.render.apply(this, arguments);
    },

    toggleSide: function () {
        var self = this;
        this.$el.find(".panel-view").toggleClass("folded");
    },
});
