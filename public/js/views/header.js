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
        }, uiUpdateInterval);
    }
});

window.HeaderView = function (options) {

    var self = this;

    self.appstatus = options['appstatus'];
    self.framestatus = options['framestatus'];

    self.el = 'el' in options ? options['el'] : $('#Panel');

    $(self.el).html(template.header());

    new SourceInfoView ({model: self.appstatus, el: $('.streams-to-air-block', self.$el)});
    new TimeInfoView   ({model: self.appstatus, el: $('.time-info-block', self.$el)});

    $('.now-playing-block', self.el).html(template.nowplaying({type: 'track'}));
    $('.show-block', self.el).html(template.nowplaying({type: 'Show'}));

    var HeaderViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;
        }
    });

    var FrameViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;
            this.progress = ko.computed(function() {
                var p = 100 * this.currentFrame() / this.totalFrames();
                return p.toPrecision(3);
            }, self);
        }
    });

    /*
      var MessagesViewModel = kb.ViewModel.extend({
      constructor: function(model) {
      kb.ViewModel.prototype.constructor.apply(this, arguments);
      this.messages = kb.collectionObservable(model);
      }
      });
    */
    self.messagesCollection = new App.MessagesCollection();
    self.messages = {
        messages: kb.collectionObservable(self.messagesCollection, { view_model: kb.ViewModel})
    };

    self.view_model = {
        Header:new HeaderViewModel(self.appstatus),
        Frame: new FrameViewModel(self.framestatus),
        Messages: self.messages,
    };

    ko.applyBindings(self.view_model, self.el[0]);

    self.selectMenuItem = function (menuItem) {
        $('#nav li').removeClass('active');
        if (menuItem) {
            $('.' + menuItem).addClass('active');
        }
        $('.btn-collapse').click()
    };

    var toggle = function(e) {
        var panel = self.el;
        var content = $('#content');

        // Make it smooth
        content.addClass("trans");

        if (panel.position().top != $(window).scrollTop()) {
            // Expanded header
            $("body").removeClass("folded");
        } else {
            // Compact header
            $("body").addClass("folded");
        };

        // Js Events
        $(window).resize();
    };
    $('#toggle-header').click(toggle);
}

