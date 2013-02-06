var gir = require ('gir')

var Gst  = gir.load ('Gst'),
    GLib = gir.load ('GLib');

Gst.init(0);

var pipeline = new Gst.Pipeline({name:'pipeline'});
var playbin = Gst.ElementFactory.make ("playbin", null);
playbin.set_property ('uri', 'file:///home/xaiki/RN15.webm');

pipeline.add (playbin);
pipeline.set_state (Gst.State.playing);

loop = new GLib.MainLoop(null);
loop.run();
