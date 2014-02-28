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
            plucked_facet = loaded_facets;
        }
        return _.map(_.uniq(_.compact(plucked_facet)), function(val) { return String(val); });
    }

    el.html(template.mediasearch({type: type, pagination: pagination}));
    console.log('Render: SearchView');
    var searchBox = $('.visual_search', el);
    this.visualSearch = VS.init({
        container : searchBox,
        query     : query,
        showFacets: false,
        placeholder: '',
        callbacks : {
            clearSearch: function(clear_cb) {
                clear_cb();
                query_obj = {};
                if (type == 'server') {
                    searchOnServer();
                }
                self.trigger('clearSearch');
            },
            search: function(query, searchCollection) {
                self.options['query'] = self.visualSearch.searchBox.currentQuery;
                query_obj = _.object(searchCollection.pluck('category'), searchCollection.pluck('value'));
                if(type == 'server') {
                    searchOnServer();
                } else {
                    collection.trigger('filter', query_obj);
                }
                self.trigger('doSearch', query_obj);
            },
            facetMatches : function(callback) {
                callback(facets);
            },
            valueMatches : function(facet, searchTerm, callback) {
                var options = {preserveOrder: true};
                if (type=='server') {
                    Backbone.sync('read', collection, {
                        silent: true,
                        data: {
                            distinct: facet,
                            query: query_obj,
                        },
                        success: function(res) {
                            var f = parseFacets(res[1], facet);
                            callback(f, options);
                        }
                    });
                } else {
                    var f = parseFacets(collection, facet);
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

    this.hideLoading = function() {
        $('.loading').removeClass('visible');
    };

    this.clearSearch = function() {
        self.visualSearch.searchBox.clearSearch('');
    };

    this.destroy = function() {
        collection.unbind("sync", this.hideLoading);
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

