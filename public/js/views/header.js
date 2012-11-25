window.HeaderView = Backbone.View.extend({
    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(template.header(this.model.toJSON()));
        return this;
    },
    selectMenuItem: function (menuItem) {
        $('.nav li').removeClass('active');
        if (menuItem) {
            $('.' + menuItem).addClass('active');
        }
        $('.btn-collapse').click()
    }

});
