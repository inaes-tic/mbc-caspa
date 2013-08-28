window.PanelView = Backbone.View.extend({
    genericEvents: {
        "click .toggle-panel": "toggleSide",
    },
    initialize: function() {
        this.events = _.extend({}, this.events, this.genericEvents);
        this.delegateEvents();
    },
    toggleSide: function () {
        var self = this;
        this.$el.find(".panel-view").toggleClass("folded");
    },
});
