window.utils = {

    // Asynchronously load templates located in separate .html files
    loadTemplate: function(views, callback) {

        var deferreds = [];

        $.each(views, function(index, view) {
            if (window[view]) {
                deferreds.push($.get('templates/' + view + '.html', function(data) {
                    window[view].prototype.template = _.template(data);
                }));
            } else {
                alert(view + " not found");
            }
        });

        $.when.apply(null, deferreds).done(callback);
    },

    displayValidationErrors: function (messages) {
        for (var key in messages) {
            if (messages.hasOwnProperty(key)) {
                this.addValidationError(key, messages[key]);
            }
        }
        this.showAlert('Warning!', 'Fix validation errors and try again', 'alert-warning');
    },

    addValidationError: function (field, message) {
        var controlGroup = $('#' + field).parent().parent();
        controlGroup.addClass('error');
        $('.help-inline', controlGroup).html(message);
    },

    removeValidationError: function (field) {
        var controlGroup = $('#' + field).parent().parent();
        controlGroup.removeClass('error');
        $('.help-inline', controlGroup).html('');
    },

    showAlert: function(title, text, klass) {
        $('.alert').removeClass("alert-error alert-warning alert-success alert-info");
        $('.alert').addClass(klass);
        $('.alert').html('<strong>' + title + '</strong> ' + text);
        $('.alert').show();
    },

    hideAlert: function() {
        $('.alert').hide();
    },

    color_scale: d3.scale.category10()
};

window.Filmstrip = function(video, elem, timeline) {

    this.video = video;
    this.elem = elem;
    this.timeline = timeline;
    this.canvas = null;
    this.context = null;
    this.count = 0;
    this.step = 0;
    this.startAt = 5;
    this.maxSteps = 0;
    this.thumbHeight = 0;
    this.thumbWidth = 0;
    this.canvasPadding = 10;

    this.init = function() {
        this.hide();
        this.count = 0;
        this.canvas = this.elem.get(0);
        this.canvas.width = this.elem.width();
        this.canvas.height = this.elem.height();

        switch(this.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                this.thumbHeight = this.canvas.height - (this.canvasPadding * 2);
                this.thumbWidth = Math.ceil(this.video.videoWidth * this.thumbHeight / this.video.videoHeight);
                this.maxSteps = Math.floor(this.elem.width() / this.thumbWidth);
                this.padding = (this.elem.width() - (this.maxSteps * this.thumbWidth)) / (this.maxSteps - 1);
                break;
            case PlayoutTimeline.VERTICAL:
                this.thumbWidth = this.canvas.width - (this.canvasPadding * 2);
                this.thumbHeight = Math.ceil(this.video.videoHeight * this.thumbWidth / this.video.videoWidth);
                this.maxSteps = Math.floor(this.elem.height() / this.thumbHeight);
                this.padding = (this.elem.height() - (this.maxSteps * this.thumbHeight)) / (this.maxSteps - 1);
                break;
        }

        $(this.canvas).css({ background: '#222' });

        if (this.maxSteps == 1) {
            this.padding = 0;
            this.step = this.video.duration - (this.startAt * 2);
        } else {
            this.step = (this.video.duration - (this.startAt * 2)) / (this.maxSteps - 1);
        }

        if (this.maxSteps) {
            this.video.currentTime = this.startAt;
        }
    };

    this.draw = function() {
        if (this.context === null) {
            this.context = this.canvas.getContext('2d');
        }

        switch(this.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                var x = (this.thumbWidth * this.count) + (this.padding * this.count);
                this.context.drawImage(this.video, x, this.canvasPadding, this.thumbWidth, this.thumbHeight);
                break;
            case PlayoutTimeline.VERTICAL:
                var y = (this.thumbHeight * this.count) + (this.padding * this.count);
                this.context.drawImage(this.video, this.canvasPadding, y, this.thumbWidth, this.thumbHeight);
                break;
        }
    };

    this.hide = function() {
        this.elem.hide();
    };

    this.show = function() {
        this.elem.show();
    };
};
