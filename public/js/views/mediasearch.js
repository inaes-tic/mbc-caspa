window.SearchView = function(options) {
    var el = options['el'];
    var type = 'type' in options ? options['type'] : 'media';
    var pagination = 'pagination' in options ? options['pagination'] : false;
    var collection = options['collection'];

    var default_page_size = 10;
    var page_size = options['page_size'] || default_page_size;

    el.html(template.mediasearch({type: type}));
    console.log('Render: SearchView');

    switch(pagination) {
        case 'traditional':
            collection.switchMode('server',{fetch: false});
            collection.setPageSize(page_size, {first: true});
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
            break;

        case 'infinite':
            var offset = 100;
            var wait = 100;
            collection.switchMode('infinite', {fetch: false});
            collection.setPageSize(page_size, {first: true, fetch: false});
            var scroll_callback = function () {
                if ($(window).scrollTop() >= ( $(document).height() - $(window).height() - offset)
                     && collection.links[collection.state.currentPage + 1] ){
                    console.log("trae pagina");
                    collection.getNextPage();
                }
            };

            var throttled = _.throttle(scroll_callback, wait);
            $(window).scroll(throttled);
            break;

        case false: break;
        default:
    }

    return;
}

