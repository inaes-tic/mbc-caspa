window.SearchView = function(options) {
    var self = this;
    _.extend(self, Backbone.Events);

    var el = options['el'];
    var type = 'type' in options ? options['type'] : 'server';
    var pagination = 'pagination' in options ? options['pagination'] : false;
    var collection = options['collection'];
    var page_size = options['page_size'] || (collection instanceof PageableCollection)?collection.state.pageSize:10;
    var type = 'type' in options ? options['type'] : 'server';
    var facets = options['facets'] || [];
    var query_obj = {};

    var nest = el.parents('.infinit-panel:first');
    var scrollable = nest.find('.scrollable:first');
    var completeList = nest.find('#playlist-table:first');

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

    this.destroy = function() {
        collection.unbind("sync");
    };


    var SearchModel = function(collection, facets) {

        this.medias = kb.collectionObservable(collection);

        this.facets = ko.observableArray(
            ko.utils.arrayMap( facets, function(facet) {
                return {
                    name: ko.observable(facet),
                    values: ko.observableArray(),
                    selected: ko.observable()
                }
            })
        );

        this.query_obj = ko.observableArray(
                /*ko.utils.arrayMap( facets, function(facet) {
                    return {
                        key: ko.observable(facet),
                        value: ko.observable(),
                    }
                })*/
        );


        this.load_facet = function(facet) {
            Backbone.sync('read', collection, {
                silent: true,
                data: {
                    distinct: facet,
                    query: self.query_obj,
                },
                success: function(res) {
                    var val = this._parseFacets(res, facet);
                    this.facets[facet].push(val);
                }
            });

        };

        this._parseFacets = function (col, facet) {
            return col.pluck(facet);
        };

        this._set_query_obj = function (key, value) {
            this.query_obj[key] = value;
        };

        this.search = function () {
            collection.setQuery(this.query_obj, page_size);
            collection.fetch({ success: function() {
                if( pagination == 'traditional') {
                    renderBootstrapPaginator();
                }
            }})
        };



    }

    el.html(template.mediasearch({type: type, pagination: pagination}));
    console.log('Render: SearchView');

    var domNode =  $('#search', el)[0];
    ko.applyBindings(new SearchModel(collection, facets), domNode);

    return this;
}

