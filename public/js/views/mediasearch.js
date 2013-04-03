window.SearchView = function(options) {
    var el = options['el'];
    var type = options['type'];
    el.html(template.mediasearch({type: type}));
    console.log('Render: SearchView');
    return;
}

