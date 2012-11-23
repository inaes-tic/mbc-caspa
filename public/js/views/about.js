window.AboutView = Backbone.View.extend({

    initialize:function () {
        this.render();
    },

    render:function () {
        $(this.el).html(template.about(this.model.toJSON()));
        return this;
    }

});
