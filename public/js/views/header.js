var uiUpdateInterval = 200;

window.sendStatus = function(prefix) {
    var p = prefix ? prefix : '';
    var shows = new Array();
    for (x in ['A', 'B', 'C']) {
        var name = p+' Show '+x;
        var show = new Media.List({name: name});
        for (idx in [1, 2, 3]) {
            show.get('collection').add( new Media.Model({name: name + ' media: ' + idx}) );
        }
        shows.push(show);
    }
    var prev = shows[0];
    var curr = shows[1];
    var next = shows[2];
    var stat = {
        source: null,
        on_air: true,
        show: {
            previous: prev,
            current: curr,
            next: next,
            progress: '70%',
        },
        piece: {
            previous: new Media.Piece({name: p + ' TRACK prev'}),
            current: new Media.Piece({name: p + ' TRACK curr'}),
            next: new Media.Piece({name: p + ' TRACK next'}),
            progress: '30%',
        }


    };

    window.appstatus.set(stat);
    window.appstatus.save();
};

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

// XXX: just for testing, prime status with something.
// XXX: KB needs the attributes that are null in the defaults
// XXX: to be real models/objects, so we'll have to address that later.
    sendStatus('Header INIT');

    var self = this;

    var model = options['model'];
    self.model = model;
    
    self.el = 'el' in options ? options['el'] : $('.header');

    $(self.el).html(template.header(this.model.toJSON()));

    new SourceInfoView ({model: self.model, el: $('.streams-to-air-block', self.$el)});
    new TimeInfoView   ({model: self.model, el: $('.time-info-block', self.$el)});

    //new NowPlayingView2 ({model: self.model.get('piece'), type: 'track', el: $('.now-playing-block', self.$el)});

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

