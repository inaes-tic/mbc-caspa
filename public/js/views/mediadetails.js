window.MediaView = function (options) {
    var model = options['model'];
    var el = $('#content');

    el.html(template.mediaview(model.toJSON()));
    console.log('MediaView 2');

    view_model = kb.viewModel(model);

    view_model.save = function (viewmodel) {
        console.log('MV save()');
        if (viewmodel) {
            console.log(viewmodel);
            viewmodel.model().save();
        }
    };

    ko.applyBindings(view_model, el[0]);

}

window.MediaView_orig = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        console.log ("rendering media");
        this.render();
    },
    render: function () {
        $(this.el).html(template.mediaview(this.model.toJSON()));
        return this;
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
