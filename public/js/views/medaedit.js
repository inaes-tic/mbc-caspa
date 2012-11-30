window.EditView = Backbone.View.extend({
    initialize: function () {
        this.render();
    },
    render: function () {
        $(this.el).html(template.mediaedit());
        return this;
    },
});
