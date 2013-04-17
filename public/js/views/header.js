var uiUpdateInterval = 200;

window.SourceInfoView = Backbone.View.extend({
        el: $('.streams-to-air-block'),
        initialize: function () {
            $(this.el).html(template.sourceinfo(this.model.toJSON()));
         }
});

window.TimeInfoView = Backbone.View.extend({
        el: $('.time-info-block'),
        initialize: function () {
            $(this.el).html(template.timeinfo(this.model.toJSON()));
            var self = this;
            setInterval (function () {
                $('#time', this.$el).html(moment().format ('HH:mm:ss'));
            }, uiUpdateInterval)
        }
});

window.HeaderView = function (options) {

    var self = this;

    var model = options['model'];
    self.model = model;

    self.el = 'el' in options ? options['el'] : $('#Panel');

    $(self.el).html(template.header(this.model.toJSON()));

    new SourceInfoView ({model: self.model, el: $('.streams-to-air-block', self.$el)});
    new TimeInfoView   ({model: self.model, el: $('.time-info-block', self.$el)});

    $('.now-playing-block', self.el).html(template.nowplaying({type: 'track'}));
    $('.show-block', self.el).html(template.nowplaying({type: 'Show'}));

    var HeaderViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;
        }
    });


    self.view_model = new HeaderViewModel(model);
    ko.applyBindings(self.view_model, self.el[0]);

    self.selectMenuItem = function (menuItem) {
        $('#nav li').removeClass('active');
        if (menuItem) {
            $('.' + menuItem).addClass('active');
        }
        $('.btn-collapse').click()
    };
}

