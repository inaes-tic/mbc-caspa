window.SearchView = Backbone.View.extend({
    defaults: {
        target: ".table",
        source: ["hello", "world"]
    },
    initialize: function () {
        this.render();
    },
    sourceFn: function (query, process) {
	var words = query.toLowerCase().split(" ");
	var table = $(this.options.target)[0];
	var ele;

	for (var r = 1; r < table.rows.length; r++){
	    ele = table.rows[r].innerHTML.replace(/<[^>]+>/g,"");
	    var displayStyle = 'none';
	    for (var i = 0; i < words.length; i++) {
		if (ele.toLowerCase().indexOf(words[i])>=0)
		    displayStyle = '';
		else {
		    displayStyle = 'none';
		    break;
		}
	    }
	    table.rows[r].style.display = displayStyle;
	}
        return this.options.sourceDefault;
    },
    render: function () {
        $(this.el).html(this.template());
        this.$el.select('#media-search').typeahead({
            source : function (query, process) {
                now.search(query, function (err, results) {
                    console.log (err, results);
                    return process(results);
                });
            }});
        $('.search-query', this.el).typeahead({target : this.options.target, 
                                               sourceDefault: this.options.source,
                                               source : this.sourceFn});
        return this;
    },

    events: {
        "change"        : "change",
        "click .save"   : "beforeSave",
        "click .delete" : "deleteMedia",
        "drop #picture" : "dropHandler"
    },

    change: function (event) {
        // Remove any existing alert message
        utils.showAlert('Success!', 'Media saved successfully', 'alert-success');

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
        this.pictureFile = e.dataTransfer.files[0];

        // Read the image file from the local file system and display it in the img tag
        var reader = new FileReader();
        reader.onloadend = function () {
            $('#picture').attr('src', reader.result);
        };
        reader.readAsDataURL(this.pictureFile);
    }

});
