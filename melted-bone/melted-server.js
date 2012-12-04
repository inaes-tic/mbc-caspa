var melted_node = require('melted-node'),
    melted_xml  = require('../node_modules/node-mlt'),
    fs          = require('fs');
    
function melted_server(opts) {
    var mlt = new melted_node();
    
    melted_server.prototype.playFile = function() {
        var xml = new melted_xml();
        
        var video = new melted_xml.Producer.Video({source: '/home/jmrunge/Downloads/Gardel/Mancha-De-Rolando-Antes.mp4'});
        xml.push(video);
        
        var playlist = new melted_xml.Playlist;
        playlist.entry({producer: video});
        xml.push(playlist);
        
        var track = new melted_xml.Multitrack.Track(playlist);
        
        var multitrack = new melted_xml.Multitrack;
        multitrack.addTrack(track);
        
        //var watermark = new melted_xml.Filter.Watermark({resource: '/home/jmrunge/melted-node/logo.jpg'});
        var webvfx = new melted_xml.Filter.WebVFX({resource: '/home/jmrunge/webvfx/demo/examples/filter-banner.html', Title: 'Suck my dick'});
        
        
        var tractor = new melted_xml.Tractor; 
        tractor.push(multitrack);
        tractor.push(webvfx);
        xml.push(tractor);
        
        fs.writeFile("/home/jmrunge/test.xml", xml.toString({pretty:true}), sendXml);
    };
    
    function sendXml(err) {
        if (err) {
            console.error(err.toString());
            return;
        }
        console.log('About to send file!');
        mlt.sendCommand("load u0 /home/jmrunge/test.xml", "200 OK");
        mlt.sendCommand("play u0");
    };
    
};

exports = module.exports = function(args) {
    var mlt_srv = new melted_server(args);
    return mlt_srv;
}
