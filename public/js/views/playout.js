window.PlayoutView = Backbone.View.extend({
    el: '#content',
    initialize: function() {
        this.render();
    },
    render: function() {
        this.$el.html(template.playout());
        return this;
    }
});