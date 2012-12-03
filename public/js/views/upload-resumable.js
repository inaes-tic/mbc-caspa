window.UploadView = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        this.render();

        $('.droparea').droppable({
            hoverClass: "resumable-dragover",
            drop: function( event, ui ) {
                $( this )
                    .addClass( "resumable-drop" )
                    .find( "p" )
                    .html( "Dropped!" );
            }
        });
        var r = new Resumable({
            target:'/media/upload',
            chunkSize:10*1024*1024,
            simultaneousUploads:4,
            testChunks:false,
            throttleProgressCallbacks:1
          });
        // Resumable.js isn't supported, fall back on a different method
        if(!r.support) {
            $('.alert').show();
            return;
        }
        $('.alert').hide();
        // Show a place for dropping/selecting files
        $('.droparea').show();
        r.assignDrop($('.droparea')[0]);
        r.assignBrowse($('.browse')[0]);

        // Handle file add event
        r.on('fileAdded', function(file){
            console.log ('added');
              // Show progress pabr
              $('.progress, .pending').show();
              // Show pause, hide resume
              $('.progress .resume').hide();
              $('.progress .pause').show();
              // Add the file to the list
              $('.pending').append('<li class="file-'+file.uniqueIdentifier+'">Uploading <span class="file-name"></span> <div class="progress progress-striped active"><div class="bar"></div></div></li>');
              $('.file-'+file.uniqueIdentifier+' .file-name').html(file.fileName);
              // Actually start the upload
              setTimeout(function () {r.upload();}, 100);
            });
          r.on('pause', function(){
              // Show resume, hide pause
              $('.progress .resume').show();
              $('.progress .pause').hide();
            });
          r.on('complete', function(){
              // Hide pause/resume when the upload has completed
              $('.progress .progress-resume-link, .progress .progress-pause-link').hide();
            });
          r.on('fileSuccess', function(file,message){
              // Reflect that the file upload has completed
              var barEl =  $('.file-'+file.uniqueIdentifier+' .bar')[0];
              var fileEl = $('.file-'+file.uniqueIdentifier+' .progress');
              fileEl.removeClass('progress-striped active');
              barEl.textContent = '(completed)';
            });
          r.on('fileError', function(file, message){
              // Reflect that the file upload has resulted in error
              $('.file-'+file.uniqueIdentifier+' .file-progress').html('(file could not be uploaded: '+message+')');
            });
        r.on('fileProgress', function(file){
            // Handle progress for both the file and the overall upload
            var barEl  =  $('.file-'+file.uniqueIdentifier+' .bar')[0];
            var fileEl =  $('.file-'+file.uniqueIdentifier+' .progress');
            var progr  =  Math.floor(file.progress()*100) + '%';

            if (!barEl)
                return;

            barEl.style.width = progr;
            barEl.textContent = progr;
            $('#main-progress').css({width:Math.floor(r.progress()*100) + '%'});
        });
        this.r = r;
    },
    render: function () {
        try {
            $(this.el).html(template.upload(this.model.toJSON()));
            return this;
        } catch (e) {
            alert (e);
        }
    },

    events: {
        "change"        : "change",
        "click .pause"  : "pause",
        "click .resume" : "resume",
        "drop .droparea" : "dropHandler",
        "all" : "debug"
    },

    pause: function () {
        this.r.pause();
    },
    resume: function () {
        this.r.upload();
    },

    debug: function (event) {
        console.log ("debug", event);
    },

    change: function (event) {

        console.log ("change", event);
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
