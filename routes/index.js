
/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', { title: 'MBC Playout {mlt edition}', 
                          subtitle: 'A simple Playout server built with magic and love'});
};

exports.tpl = function(req, res){
    res.render(req.url.substring(1));
};
