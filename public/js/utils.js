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


window.Filmstrip = function(model, args) {

    this.model = null;
    this.video = null;
    this.canvas = null;
    this.context = null;
    this._frameHeight = 0;
    this._frameWidth = 0;
    this._framePadding = 0;
    this._count = 0;
    this._step = 0;
    this._maxSteps = 0;
    this._canvasDrawn = false;

    this._createCanvas = function() {
        return $('<canvas />')
            .attr({ width: this.width, height: this.height })
            .get(0);
    };

    __construct = function(self) {
        var opts = {
            width: 80,
            height: 400,
            bgColor: '#333',
            drawHoles: true,
            holesColor: '#222',
            holesDispersion: .8,
            bandsPadding: 20,
            orientation: 'vertical',
            autoOrientation: true,
            startAt: 5,
            strechOnResize: true,
            autoResize: true,
        }

        for (opt in opts) {
            self[opt] = (args[opt] !== undefined) ? args[opt] : opts[opt];
        }

        self.model = model;
        self.canvas = self._createCanvas();
        self.context = self.canvas.getContext('2d');
    }(this);

    this.load = function() {
        var self = this;
        var video = $('<video preload="metadata" />')
            .attr('src', self.model.src)
            .bind('loadedmetadata', function() {
                self.video = this;
                if (self.autoResize) {
                    self.resize(self.width, self.height);
                }
                $(self).trigger('loaded');
            })
            .bind('seeked', function() {
                self._drawFrame();
                if (self._count < self._maxSteps - 1) {
                    self._count++;
                    self.video.currentTime += self._step;
                } else {
                    self.setCanvas(self._tmpCanvas);
                    self._destroyTmpCanvas();
                    self._canvasDrawn = true;
                    $(self).trigger('draw:finished');
                }
            });
    };

    this.resize = function(width, height) {
        switch (this.orientation) {

            case 'horizontal':
                this.width = width;
                if (height !== undefined) {
                    this.height = height;
                }

                this.attrTrans = {
                    x: 'x',
                    y: 'y',
                    width: 'width',
                    height: 'height',
                    x0: 'x0',
                    x1: 'x1',
                    y0: 'y0',
                    y1: 'y1',
                    videoWidth: 'videoWidth',
                    videoHeight: 'videoHeight',
                    _frameWidth: '_frameWidth',
                    _frameHeight: '_frameHeight',
                };
                break;

            case 'vertical':
                if (height === undefined) {
                    this.height = width;
                } else {
                    this.width = width;
                    this.height = height;
                }

                this.attrTrans = {
                    x: 'y',
                    y: 'x',
                    width: 'height',
                    height: 'width',
                    x0: 'y0',
                    x1: 'y1',
                    y0: 'x0',
                    y1: 'x1',
                    videoWidth: 'videoHeight',
                    videoHeight: 'videoWidth',
                    _frameWidth: '_frameHeight',
                    _frameHeight: '_frameWidth',
                };
                break;

        }

        if (this.width == 0 || this.height == 0) {
            return;
        }

        if (this.autoOrientation) {
            this.orientation = (this.width > this.height * 2) ?
                'horizontal' :  'vertical';
        }

        this[this.attrTrans._frameHeight] = (
            this[this.attrTrans.height] - (this.bandsPadding * 2)
        );
        this[this.attrTrans._frameWidth] = Math.ceil(
            this.video[this.attrTrans.videoWidth] *
            this[this.attrTrans._frameHeight] /
            this.video[this.attrTrans.videoHeight]
        );
        this._maxSteps = Math.floor(
            this[this.attrTrans.width] / this[this.attrTrans._frameWidth]
        );
        this._framePadding = (
            (this[this.attrTrans.width] - 
                (this._maxSteps * this[this.attrTrans._frameWidth])
            ) / (this._maxSteps - 1)
        );

        this._count = 0;
        if (this._maxSteps == 1) {
            this._framePadding = 0;
            this._step = this.video.duration - (this.startAt * 2);
        } else {
            this._step = (
                (this.video.duration - (this.startAt * 2)) /
                (this._maxSteps - 1)
            );
        }

        if (this._maxSteps) {
            this._createTmpCanvas();
            this.video.currentTime = this.startAt;
            $(self).trigger('draw:started');
        }
    };

    this._drawFrame = function() {
        var _ = {};

        _[this.attrTrans.y] = this.bandsPadding;
        _[this.attrTrans.x] = this[this.attrTrans._frameWidth] * this._count;

        if (this._maxSteps <= 5) {
            var extraPadding = (
                (this[this.attrTrans.width] -
                    (this[this.attrTrans._frameWidth] * this._maxSteps)
                ) / (this._maxSteps + 1)
            );
            _[this.attrTrans.x] += extraPadding * (this._count + 1);
        } else {
            _[this.attrTrans.x] += this._framePadding * this._count;
        }

        this._tmpContext.drawImage(
            this.video,
            _.x,
            _.y,
            this._frameWidth,
            this._frameHeight
        );

        $(this).trigger('draw:frame', {
            x: _.x,
            y: _.y,
            width: this._frameWidth,
            height: this._frameHeight,
            pos: this._count,
            steps: this._maxSteps,
        });
    };

    this.on = function(event, handler) {
        $(this).on(event, handler);
    };

    this._createTmpCanvas = function() {
        this._tmpCanvas = this._createCanvas();
        this._tmpContext = this._tmpCanvas.getContext('2d');
        this.drawBaseFilmstrip(this._tmpContext);
    };

    this._destroyTmpCanvas = function() {
        delete this._tmpCanvas;
        delete this._tmpContext;
    };

    this.setCanvas = function(canvas) {
        this.width = canvas.width;
        this.height = canvas.height;
        this.canvas.width = canvas.width;
        this.canvas.height = canvas.height;
        this.context.drawImage(canvas, 0, 0);
    };

    this.drawCanvas = function(elem) {
        var canvas = elem.get(0);
        canvas.width = this.width;
        canvas.height = this.height;
        var context = canvas.getContext('2d');
        context.drawImage(this.canvas, 0, 0);
    };

    this.drawFrame = function(elem, args) {
        var canvas = elem.get(0);
        var context = canvas.getContext('2d');

        if (args.pos == 0) {
            canvas.width = this.width;
            canvas.height = this.height;
            if (this.strechOnResize && this._canvasDrawn) {
                context.drawImage(
                    this.canvas, 
                    0,
                    0,
                    this._tmpCanvas.width,
                    this._tmpCanvas.height
                );
            }
        }

        var _ = {};

        if (args.pos) {
            _[this.attrTrans.x] = args[this.attrTrans.x] - this._framePadding;
            _[this.attrTrans.width] = args[this.attrTrans.width] + this._framePadding;
        } else {
            _[this.attrTrans.x] = args[this.attrTrans.x];
            _[this.attrTrans.width] = args[this.attrTrans.width];
        }

        _[this.attrTrans.y] = 0;
        _[this.attrTrans.height] = this[this.attrTrans.height];

        if (args.pos == args.steps - 1) {
            _[this.attrTrans.x] = Math.floor(_[this.attrTrans.x]);
            _[this.attrTrans.width] = this._tmpCanvas[this.attrTrans.width] - _[this.attrTrans.x];
        }

        context.drawImage(
            this._tmpCanvas,
            _.x,
            _.y,
            _.width,
            _.height,
            _.x,
            _.y,
            _.width,
            _.height
        );
    };

    this.drawBaseFilmstrip = function(context) {
        //context.fillStyle = this.bgColor;
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);

        if (this.drawHoles && this.bandsPadding) {
            context.fillStyle = this.holesColor;
            var _ = {};

            _[this.attrTrans.height] = this.bandsPadding / 2;
            _[this.attrTrans.width] = _[this.attrTrans.height] / 2;
            _[this.attrTrans.y0] = (
                (this.bandsPadding - _[this.attrTrans.height]) / 2
            );
            _[this.attrTrans.y1] = (
                context.canvas[this.attrTrans.height] -
                _[this.attrTrans.y0] -
                _[this.attrTrans.height]
            );

            var total = Math.ceil(
                ((context.canvas[this.attrTrans.width] - (_[this.attrTrans.y0] * 2)) /
                _[this.attrTrans.width] / 2) * this.holesDispersion
            );
            var sep = (
                (context.canvas[this.attrTrans.width] -
                    _[this.attrTrans.height] -
                    (_[this.attrTrans.width] * total)
                ) / (total - 1)
            );

            for (var i = 0; i < total; i++) {
                _[this.attrTrans.x0] = _[this.attrTrans.y0] + (
                    (_[this.attrTrans.width] + sep) * i
                );
                _[this.attrTrans.x1] = _[this.attrTrans.x0];
                context.fillRect(_.x0, _.y0, _.width, _.height);
                context.fillRect(_.x1, _.y1, _.width, _.height);
            }

        }

    };

};
