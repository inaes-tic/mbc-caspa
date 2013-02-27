var estimatedSchedulePosixTime = null;
var localRemoteTimeOffset = null;

var previousSong = null;
var currentSong = null;
var nextSong = null;

var currentShow = new Array();
var nextShow = new Array();

var showName = null;

var currentElem;

var serverUpdateInterval = 5000;
var uiUpdateInterval = 200;

var master_dj_on_air = false;
var live_dj_on_air = false;
var scheduled_play_on_air = false;
var scheduled_play_source = false;

//keep track of how many UI refreshes the ON-AIR light has been off for.
//For example, the uiUpdateInterval is every 200ms, so if onAirOffIterations
//is 25, then that means 5 seconds have gone by.
var onAirOffIterations = 0;

//var timezoneOffset = 0;

/* boolean flag to let us know if we should prepare to execute a function
 * that flips the playlist to the next song. This flags purpose is to
 * make sure the function is only executed once*/
var nextSongPrepare = true;
var nextShowPrepare = true;

function calcAdditionalData(currentItem){
    currentItem.songStartPosixTime = convertDateToPosixTime(currentItem.starts);
    currentItem.songEndPosixTime = convertDateToPosixTime(currentItem.ends);
    currentItem.songDurationMs = currentItem.songEndPosixTime - currentItem.songStartPosixTime;
}

function calcAdditionalShowData(show){
    if (show.duration > 0){
        show[0].showStartPosixTime = convertDateToPosixTime(show[0].start_timestamp);
        show[0].showEndPosixTime = convertDateToPosixTime(show[0].end_timestamp);
        show[0].showDurationMs = show[0].showEndPosixTime - show[0].showStartPosixTime;
    }
}

window.NowPlayingView = Backbone.View.extend({
        el: $('.now-playing-block'),
        initialize: function () {
            $(this.el).html(template.nowplaying(this.options));
        }
});


window.SourceInfoView = Backbone.View.extend({
        el: $('.streams-to-air-block'),
        initialize: function () {
            $(this.el).html(template.sourceinfo(this.model.toJSON()));
         }
});

window.TimeInfoView = Backbone.View.extend({
        el: $('.time-info-block'),
        initialize: function () {
            $(this.el).html(template.timeinfo(this.model.toJSON()));
            var self = this;
            setInterval (function () {
                $('#time', this.$el).html(moment().format ('HH:mm:ss'));
            }, uiUpdateInterval)
        }
});

window.HeaderView = Backbone.View.extend({
    initialize: function () {
        $(this.el).html(template.header(this.model.toJSON()));

        new NowPlayingView ({type: 'track', el: $('.now-playing-block', this.$el)});
        new NowPlayingView ({type: 'show',  el: $('.show-block', this.$el)});

        new SourceInfoView ({model: this.model, el: $('.streams-to-air-block', this.$el)});
        new TimeInfoView   ({model: this.model, el: $('.time-info-block', this.$el)});

        //begin consumer "thread"
        this.secondsTimer();

        $('.listen-control-button').click(function() {
            if (stream_window == null || stream_window.closed)
                stream_window=window.open(baseUrl+"Dashboard/stream-player", 'name', 'width=400,height=158');
            stream_window.focus();
            return false;
        });

        this.model.bind("all", function (event, arg) {
            console.log ('an item view got', event, arg)
            this.parseItems(this.model.toJSON());
        }, this);

    },

    secondsTimer: function ()  {
        if (localRemoteTimeOffset !== null){
            var date = new Date();
            estimatedSchedulePosixTime = date.getTime() - localRemoteTimeOffset;
            this.updateProgressBarValue();
/*            this.updatePlaybar();
            this.controlOnAirLight();
            this.controlSwitchLight();*/
        }
        setTimeout(this.secondsTimer, uiUpdateInterval);
    },

    parseItems: function (obj){
        console.log ('PARSE ITEMS', obj);
        $('#time-zone').text(obj.timezone);

        previousSong = mediaList.get(obj.piece.previous);
        currentSong  = mediaList.get(obj.piece.current);
        nextSong     = mediaList.get(obj.piece.next);

        if (previousSong !== null)
            calcAdditionalData(previousSong);
        if (currentSong !== null)
            calcAdditionalData(currentSong);
        if (nextSong !== null)
            calcAdditionalData(nextSong);

        calcAdditionalShowData(obj.show.current);
        calcAdditionalShowData(obj.show.next);

        currentShow = obj.show.current;
        nextShow = obj.show.next;

        var schedulePosixTime = convertDateToPosixTime(obj.schedulerTime);
        //timezoneOffset = parseInt(obj.timezoneOffset)*1000;
        var date = new Date();
        localRemoteTimeOffset = date.getTime() - schedulePosixTime;
    },

    /* Called every "uiUpdateInterval" mseconds. */
    updateProgressBarValue: function (){
        var showPercentDone = 0;
        if (currentShow.duration > 0){
            showPercentDone = (estimatedSchedulePosixTime - currentShow[0].showStartPosixTime)/currentShow[0].showDurationMs*100;
            if (showPercentDone < 0 || showPercentDone > 100){
                showPercentDone = 0;
                currentShow = new Array();
                currentSong = null;
            }
        }
        $('#progress-show').attr("style", "width:"+showPercentDone+"%");

        var songPercentDone = 0;
        var scheduled_play_div = $("#scheduled_play_div");
        var scheduled_play_line_to_switch = scheduled_play_div.parent().find(".line-to-switch");

        if (currentSong !== null){	
            var songElapsedTime = 0;
            songPercentDone = (estimatedSchedulePosixTime - currentSong.songStartPosixTime)/currentSong.songDurationMs*100;
            songElapsedTime = estimatedSchedulePosixTime - currentSong.songStartPosixTime;
            if (songPercentDone < 0 || songPercentDone > 100){
                songPercentDone = 0;        
                currentSong = null;
            } else {
                if ((currentSong.media_item_played == true && currentShow.duration > 0) || (songElapsedTime < 5000 && currentShow[0].record != 1)) {
                    scheduled_play_line_to_switch.attr("class", "line-to-switch on");
                    scheduled_play_div.addClass("ready");
                    scheduled_play_source = true;
                }
                else{
                    scheduled_play_source = false;
                    scheduled_play_line_to_switch.attr("class", "line-to-switch off");
                    scheduled_play_div.removeClass("ready");
                }
                $('#progress-show').attr("class", "progress-show");
            }
        } else {
            scheduled_play_source = false;
            scheduled_play_line_to_switch.attr("class", "line-to-switch off");
            scheduled_play_div.removeClass("ready");
            $('#progress-show').attr("class", "progress-show-error");

        }
        $('#progress-bar').attr("style", "width:"+songPercentDone+"%");

        //calculate how much time left to next song if there is any
        if (nextSong !== null && nextSongPrepare){
            var diff = nextSong.songStartPosixTime - estimatedSchedulePosixTime;
            if (diff < serverUpdateInterval){

                //sometimes the diff is negative (-100ms for example). Still looking
                //into why this could sometimes happen.
                if (diff < 0)
                    diff=0;

                nextSongPrepare = false;
                setTimeout(newSongStart, diff);
            }
        }

        //calculate how much time left to next show if there is any
        if (nextShow.duration > 0 && nextShowPrepare){
            var diff = nextShow[0].showStartPosixTime - estimatedSchedulePosixTime;
            if (diff < serverUpdateInterval){
                if (diff < 0)
                    diff=0;

                nextShowPrepare = false;
                setTimeout(nextShowStart, diff);
            }
        }
    },


    selectMenuItem: function (menuItem) {
        $('#nav li').removeClass('active');
        if (menuItem) {
            $('.' + menuItem).addClass('active');
        }
        $('.btn-collapse').click()
    }

});
