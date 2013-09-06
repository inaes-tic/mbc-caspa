window.SearchView = function(options) {
    var el = options['el'];
    var type = 'type' in options ? options['type'] : 'server';
    var pagination = 'pagination' in options ? options['pagination'] : false;
    var collection = options['collection'];
    var page_size = options['page_size'] || collection.state.pageSize;
    var type = 'type' in options ? options['type'] : 'server';
    var facets = options['facets'] || [];
    var query_obj = {};

    var nest = el.parents('.infinit-panel:first');
    var scrollable = nest.find('.scrollable:first');
    var completeList = nest.find('#playlist-table:first');

    var parseFacets = function (loaded_facets, facet) {
        var plucked_facet = [];
        if (loaded_facets instanceof PageableCollection || loaded_facets instanceof Backbone.Collection) {
            if (facet.indexOf('.') === -1) {
                plucked_facet = loaded_facets.pluck(facet)
            } else {
                facets = facet.split('.');
                first = facets.shift();
                remainder = facets.join('.');
                plucked_facet = _.pluck(loaded_facets.pluck(first), remainder);
            }
        } else {
            plucked_facet = _.pluck(loaded_facets, facet);
        }
        return _.map(_.compact(_.uniq(plucked_facet)), function(val) { return String(val); });
    }

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

    var loaded_facets = {};
    var searchBox = $('.visual_search', el);
    var visualSearch = VS.init({
        container : searchBox,
        query     : '',
        showFacets: false,
        placeholder: '',
        callbacks : {
            clearSearch: function(clear_cb) {
                clear_cb();
                query_obj = {};
                if(type=='server') {
                    searchOnServer();
                } else {
                    console.log('borrar en cli');
                }
            },
            search: function(query, searchCollection) {
                query_obj = _.object(searchCollection.pluck('category'), searchCollection.pluck('value'));
                if(type == 'server') {
                    searchOnServer();
                } else {
                    console.log(query_obj);
                    collection.trigger('filter', query_obj);
                    console.log('busca en cli');
                }
            },
            facetMatches : function(callback) {
                callback(facets);
            },
            valueMatches : function(facet, searchTerm, callback) {
                var options = {preserveOrder: true};
                if (!loaded_facets.length) {
                  if(type=='server') {
                    Backbone.sync('read', collection, {
                        silent: true,
                        data: { fields: facets },
                        success: function(res) {
                            loaded_facets = res[1];
                            var f = parseFacets(loaded_facets, facet);
                            callback(f, options);
                        }
                    });
                  } else {
                    loaded_facets = collection;
                    var f = parseFacets(loaded_facets, facet);
                    callback(f, options);
                  }
                } else {
                    var f = parseFacets(loaded_facets, facet);
                    callback(f, options);
                }
            },
            focus: function() {
            },
            blur: function() {
            }
        }
    });
    searchBox.find('input').focus();

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

