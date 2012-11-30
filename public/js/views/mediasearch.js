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
        $(this.el).html(template.mediasearch());
        $(this.el, '#media-search').typeahead({
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
});
