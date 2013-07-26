window.SearchView = function(options) {
    var el = options['el'];
    var type = 'type' in options ? options['type'] : 'server';
    var pagination = 'pagination' in options ? options['pagination'] : false;
    var collection = options['collection'];
    var page_size = options['page_size'] || 10;
    var type = 'type' in options ? options['type'] : 'server';
    var facets = options['facets'] || [];
    var query_obj = {};

    el.html(template.mediasearch({type: type, pagination: pagination}));
    console.log('Render: SearchView');

    switch(pagination) {
        case 'traditional':
            collection.switchMode('server', {fetch: false});
            collection.setPageSize(page_size,{fetch:false, first: true});
            renderBootstrapPaginator();
            break;
        case 'endless':
            var offset = 100;
            var wait = 100;
            collection.switchMode('endless', {fetch: false});
            collection.setPageSize(page_size,{fetch: false, first: true});
            var scroll_callback = function () {
                if ($(window).scrollTop() >= ( $(document).height() - $(window).height() - offset)
                     && collection.hasNext() ){
                    collection.getNextPage();
                }
            };

            var throttled = _.throttle(scroll_callback, wait);
            $(window).scroll(throttled);
            break;

        case false: break;
        default:
    }

    var visualSearch = VS.init({
        container : $('.visual_search'),
        query     : '',
        showFacets: true,
        callbacks : {
            clearSearch: function(clear_cb) {
                clear_cb();
                query_obj = {};
                searchOnServer();
            },
            search: function(query, searchCollection) {
                query_obj = _.object(searchCollection.pluck('category'), searchCollection.pluck('value'));
                searchOnServer();
            },
            facetMatches : function(callback) {
                callback(facets);
            },
            valueMatches : function(facet, searchTerm, callback) {
                Backbone.sync('read', collection, {
                    silent: true,
                    data: { fields: facets },
                    success: function(res) {
                        var f = _.compact(_.uniq(_.pluck(res[1], facet)));
                        callback(f);
                    }
                });
            },
            focus: function() {
            },
            blur: function() {
            }
        }
    });

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

    function searchOnServer() {
        collection.setQuery(query_obj, page_size);
        collection.fetch({ success: function() {
            if( pagination == 'traditional') {
                renderBootstrapPaginator();
            }
        }});
    }

    return;
}

