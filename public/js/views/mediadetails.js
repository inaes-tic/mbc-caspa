window.MediaView = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        console.log ("rendering media");
        this.render();
    },
    render: function () {
        try {
            $(this.el).html(template.mediaview(this.model.toJSON()));
            return this;
        } catch (e) {
            alert (e);
        }
    },

    events: {
        "change"        : "change",
        "click .save"   : "beforeSave",
        "click .delete" : "deleteMedia",
        "drop .droparea" : "dropHandler"
    },

    change: function (event) {
        // Remove any existing alert message
        utils.hideAlert();

        // Apply the change to the model
        var target = event.target;
        var change = {};
        change[target.name] = target.value;
        this.model.set(change);

        // Run validation rule (if any) on changed item
        var check = this.model.validateItem(target.id);
        if (check.isValid === false) {
            utils.addValidationError(target.id, check.message);
        } else {
            utils.removeValidationError(target.id);
        }
    },

    beforeSave: function () {
        var self = this;
        var check = this.model.validateAll();
        if (check.isValid === false) {
            utils.displayValidationErrors(check.messages);
            return false;
        }
        this.saveMedia();
        return false;
    },

    saveMedia: function () {
        var self = this;
        console.log('before save');
        this.model.save(null, {
            success: function (model) {
                self.render();
                app.navigate('media/' + model.id, false);
                utils.showAlert('Success!', 'Media saved successfully', 'alert-success');
            },
            error: function () {
                utils.showAlert('Error', 'An error occurred while trying to delete this item', 'alert-error');
            }
        });
    },

    deleteMedia: function () {
        this.model.destroy({
            success: function () {
                alert('Media deleted successfully');
                window.history.back();
            }
        });
        return false;
    },

    dropHandler: function (event) {
        event.stopPropagation();
        event.preventDefault();
        var e = event.originalEvent;
        e.dataTransfer.dropEffect = 'copy';
        var f = e.dataTransfer.files[0];
        console.log (f);
//        this.model.set({file: f});

        // Read the image file from the local file system and display it in the img tag

        var progress = $('.bar')[0];
        var chunk_size = 4*1024*1024;
        var read_size = 0;
        var spark = new SparkMD5();

        $('.progress').addClass('progress-striped active');

        function read_chunk () {
            var reader = new FileReader();
            reader.onprogress = function (evt) {
                // evt is an ProgressEvent.
                if (evt.lengthComputable) {
                    var percentLoaded = Math.round(((read_size + evt.loaded)/ f.size) * 100);
                    // Increase the progress bar length.
                    if (percentLoaded < 100) {
                        progress.style.width = percentLoaded + '%';
                        progress.textContent = percentLoaded + '%';
                    }
                }
            };
            reader.onloadend = function (evt) {
                spark.appendBinary(reader.result);
                reader.abort();
                delete (reader.result);
                read_size += evt.loaded;
                if (read_size < f.size) {
                    read_chunk();
                } else {
                    $('.progress').removeClass('progress-striped active');
                    progress.style.width = '100%';
                    progress.textContent = '100%' + spark.end();
                }
            };

            var blob = f.slice (read_size, read_size + chunk_size);
            reader.readAsBinaryString(blob);
        }

        read_chunk();
        return;
        this.saveMedia();

        reader.readAsDataURL(f);
    }

});
