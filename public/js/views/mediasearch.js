window.SearchView = function(options) {
    var self = this;
    _.extend(self, Backbone.Events);

    self.options = options;

    var el = options['el'];
    var title = 'title' in options ? options['title'] : i18n.gettext('Search');
    var pagination = 'pagination' in options ? options['pagination'] : false;
    var collection = options['collection'];
    var page_size = options['page_size'] || (collection instanceof PageableCollection)?collection.state.pageSize:10;
    var type = 'type' in options ? options['type'] : 'server';
    var facets = options['facets'] || [];
    var query_obj = {};
    var query = options['query'] || '';

    var nest = el.parents('.infinit-panel:first');
    var scrollable = nest.find('.scrollable:first');
    var completeList = nest.find('#playlist-table:first');

    el.html(template.mediasearch({type: type, pagination: pagination}));
    console.log('Render: SearchView');

    switch(pagination) {
        case 'traditional':
            // XXX WARN: changing page size breaks relations. Just Don't Do It.
            if (page_size != collection.state.pageSize){
                collection.setPageSize(page_size,{fetch:false});
            }
            renderBootstrapPaginator();
            break;
        case 'endless':
            var offset = 100;
            var wait = 100;
            // XXX WARN: changing page size breaks relations. Just Don't Do It.
            if (page_size != collection.state.pageSize){
                collection.setPageSize(page_size,{fetch: false, first: true});
            }
            var scroll_callback = function () {
                if (scrollable.scrollTop() >= (completeList.height() - scrollable.height() - offset)
                     && collection.hasNext() ){
                    collection.getNextPage({remove: false});
                    $('.loading').addClass('visible');
                }
            };

            var throttled = _.throttle(scroll_callback, wait);
            scrollable.scroll(throttled);

            collection.bind("sync", function() {
               $('.loading').removeClass('visible');
            });
            break;

        case false: break;
        default:
    }

    var searchBox = $('.typeahead', el);

    var bh_init_object = {
        datumTokenizer: function(d) { return Bloodhound.tokenizers.whitespace(d); },
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        remote: {
            url: '%QUERY',
            transport: function(url, o, onSuccess, onError) {
                var query_obj = {};
                query_obj['text'] = decodeURIComponent(url);

                if(type == 'server') {
                    Backbone.sync('read', collection, {
                        silent: true,
                        data: {
                            query: query_obj,
                        },
                        success: function(res) {
                            onSuccess(res[1]);
                        },
                        error: function() {
                            onError("Error: getting search data");
                        }
                    });
                } else {
                    collection.trigger('filter', query_obj);
                    onError();
                }
            }
        }
    };

    var media = new Bloodhound(bh_init_object);
    media.initialize();

    var createBh = function(facet) {
        var url = facet + moment().valueOf();
        var bh = new Bloodhound({
            datumTokenizer: function(d) { return Bloodhound.tokenizers.whitespace(d.value); },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            prefetch: {
                url: url,
                transport: function(url, onSuccess, onError) {
                    Backbone.sync('read', collection, {
                        silent: true,
                        data: {
                            distinct: facet,
                        },
                        success: function(res) {
                            var data = _.map(res[1], function(rec) { return { 'value': rec.toString() }; } );
                            onSuccess(data);
                        },
                        error: function() {
                            onError("Error: getting facets data");
                        }
                    });
                }
            }
        });
        bh.initialize();
        return bh;
    };

    var bloodhoundFacets = _.map(facets, function(facet) {
        var bh = createBh(facet);
        var dataset = {
            name: facet,
            source: bh.ttAdapter(),
            templates: {
                empty:      template.typeahead_empty(),
                header:     template.typeahead_header({value : facet}),
                suggestion: template.typeahead_suggestion,
                footer:     template.typeahead_footer(),
            }
        };
        return dataset;
    });

    searchBox.typeahead.apply(
        searchBox,
        [
            { highlight: true, minLength: 2 },
            {
                name: title,
                display: function(suggestion) {
                    return utils.deep(suggestion, collection.typeahead);
                },
                source: media.ttAdapter(),
                templates: {
                    empty:      template.typeahead_empty(),
                    header:     template.typeahead_header({ value : title}),
                    footer:     template.typeahead_footer(),
                    suggestion: _.compose( template.typeahead_suggestion, function(obj) {
                        obj['value'] = utils.deep(obj, collection.typeahead);
                        return obj;
                    }),
                }
            }
        ].concat(bloodhoundFacets))
    .on('typeahead:selected', function(el, datum, dataset){
        if(type == "server") {
            if( facets.indexOf(dataset) !== -1 ) {
                console.log('Facet selected');
                var query_obj = {};
                query_obj[dataset] = datum.value;
                searchOnServer(query_obj);
            } else {
                collection.reset(datum);
            }
        } else {
            if( facets.indexOf(dataset) !== -1 ) {
                collection.trigger('filter', query_obj);
            } else {
                collection.reset(datum);
            }
        }
    })
    .on('typeahead:autocompleted', function(el, datum, dataset) {})
    .on('keyup', function() {
         if(!this.value){
            console.log("empty input");
            if(type == 'server') {
                searchOnServer({});
            } else {
                collection.trigger('filter', {});
            }
         }
    })
    .val(self.options.query);

    function renderBootstrapPaginator() {
        $(".pagination", el).html("");
        if(collection.state.totalPages > 1) {
            var pag_options = { currentPage: 1,
                totalPages: collection.state.totalPages ,
                size: 'mini',
                onPageClicked: function(e, originalEvent, type, page) {
                    collection.getPage((page-1));
                }
            };
            $(".pagination", el).bootstrapPaginator(pag_options);
        }
    }

    function searchOnServer(query_obj) {
        collection.setQuery(query_obj, page_size);
        collection.fetch({ success: function() {
            if( pagination == 'traditional') {
                renderBootstrapPaginator();
            }
        }});
    }

    this.hideLoading = function() {
        $('.loading').removeClass('visible');
    };

    this.clearSearch = function() {
        searchBox.typeahead('val', '');
    };

    this.destroy = function() {
        collection.unbind("sync", this.hideLoading);
        searchBox.typeahead('destroy');
        self.options.query = searchBox.val();
    };

    switch(pagination) {
        case 'traditional':
            // XXX WARN: changing page size breaks relations. Just Don't Do It.
            if (page_size != collection.state.pageSize){
                collection.setPageSize(page_size,{fetch:false});
            }
            renderBootstrapPaginator();
            break;
        case 'endless':
            var offset = 100;
            var wait = 100;
            // XXX WARN: changing page size breaks relations. Just Don't Do It.
            if (page_size != collection.state.pageSize){
                collection.setPageSize(page_size,{fetch: false, first: true});
            }
            var scroll_callback = function () {
                if (scrollable.scrollTop() >= (completeList.height() - scrollable.height() - offset)
                     && collection.hasNext() ){
                    collection.getNextPage({remove: false});
                    $('.loading').addClass('visible');
                }
            };

            var throttled = _.throttle(scroll_callback, wait);
            scrollable.scroll(throttled);

            // I thought that hoisting would work here but self.hideLoading is undefined otherwise,
            // so I moved this whole block to the end.
            collection.bind("sync", self.hideLoading, self);
            break;

        case false: break;
        default:
    }

    return this;
}
