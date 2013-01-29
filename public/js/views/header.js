window.HeaderView = Backbone.View.extend({
    initialize: function () {
            $(this.el).html(template.header(this.model.toJSON()));
            setInterval(function () {
                    $('#time', this.el).html(moment.utc().format('hh:mm:ss'))
                    }, 200);

    },

    selectMenuItem: function (menuItem) {
        $('#nav li').removeClass('active');
        if (menuItem) {
            $('.' + menuItem).addClass('active');
        }
        $('.btn-collapse').click()
    }

});
