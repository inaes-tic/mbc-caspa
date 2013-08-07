window.HomeView = Backbone.View.extend({

    initialize:function () {
        this.render();
    },

    render:function () {
        $(this.el).removeClass("trans Pov").addClass("container-fluid no-Pov");
        $(this.el).html(this.template());
        return this;
    }

});
