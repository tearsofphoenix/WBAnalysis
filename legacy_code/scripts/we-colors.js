var Colors = { };

(function() {
    var gray = new WeiboEvents.Color(128,128,128);
    var white = new WeiboEvents.Color(255,255,255);
    var black = new WeiboEvents.Color(0,0,0);

    Colors.setWhiteScheme = function() {
        var base_blue = new WeiboEvents.Color(32,96,213);

        Colors.histogram = {
            fill: base_blue
        };

        Colors.spanArea = {
            fill: base_blue.interp(white, 0.7),
            stroke: base_blue.interp(white, 0.5)
        };

        Colors.node = {
            normal: base_blue,
            fade: gray.interp(white, 0.4)
        };

        Colors.link = {
            normal: base_blue.interp(white, 0.7),
            fade: gray.interp(white, 0.8)
        };

        Colors.nodeColor = {
            male: base_blue,
            female: new WeiboEvents.Color(255,127,14),
            verified: new WeiboEvents.Color(255,127,14),
            level: function(l) {
                return Colors.node.normal.interp(Colors.background, 1 - 0.8 * Math.exp(-l / 3) - 0.2);
            }
        };

        Colors.marker = new WeiboEvents.Color(0, 0, 0, 0.6);

        Colors.background = white;
        Colors.panel_background = new WeiboEvents.Color(250,250,250);
        Colors.foreground = black;

        Colors.traceColor = new WeiboEvents.Color(255,127,14);
        Colors.highlightColor = new WeiboEvents.Color(255,127,14);
        Colors.highlightSameAuthor = new WeiboEvents.Color(255,127,14);

        Colors.dragging = new WeiboEvents.Color(255,127,14);
        Colors.selectBox = {
            border: base_blue,
            fill: base_blue.ofAlpha(0.3)
        };

        Colors.hoverBox = {
            border: base_blue,
            fill: base_blue.interp(white, 0.8).setAlpha(0.7),
            text: black
        };

        Colors.highlightBox = {
            border: Colors.highlightColor,
            fill: Colors.highlightColor.interp(white, 0.95),
            title: Colors.highlightColor.interp(white, 0.8),
            text: black
        };
        Colors.highlightBoxCold = {
            border: base_blue,
            fill: base_blue.interp(white, 0.95),
            title: base_blue.interp(white, 0.8),
            text: black
        };
    };

    Colors.setBlackScheme = function() {
        var base_blue = new WeiboEvents.Color(87,131,254);

        Colors.spanArea = {
            fill: base_blue.interp(black, 0.3),
            stroke: base_blue.interp(black, 0.2)
        };

        Colors.node = {
            normal: base_blue,
            fade: gray
        };

        Colors.link = {
            normal: base_blue.interp(black, 0.2),
            fade: gray.interp(black, 0.3)
        };

        Colors.nodeColor = {
            male: base_blue,
            female: new WeiboEvents.Color(255,127,14),
            verified: new WeiboEvents.Color(255,127,14),
            level: function(l) {
                return Colors.node.normal.interp(Colors.background, 1 - 0.8 * Math.exp(-l / 3) - 0.2);
            }
        };

        Colors.marker = new WeiboEvents.Color(255,255,255,0.6);

        Colors.background = black;
        Colors.panel_background = new WeiboEvents.Color(30,30,30);
        Colors.foreground = new WeiboEvents.Color(192,192,192);

        Colors.traceColor = new WeiboEvents.Color(255,127,14);
        Colors.highlightColor = new WeiboEvents.Color(255,127,14);
        Colors.highlightSameAuthor = new WeiboEvents.Color(255,127,14);

        Colors.dragging = new WeiboEvents.Color(255,127,14);
        Colors.selectBox = {
            border: base_blue,
            fill: base_blue.ofAlpha(0.3)
        };

        Colors.hoverBox = {
            border: base_blue,
            fill: base_blue.interp(black, 0.8).setAlpha(0.7),
            text: new WeiboEvents.Color(220,220,220)
        };

        Colors.highlightBox = {
            border: Colors.highlightColor,
            fill: Colors.highlightColor.interp(black, 0.9),
            title: Colors.highlightColor.interp(black, 0.8),
            text: white
        };
        Colors.highlightBoxCold = {
            border: base_blue,
            fill: base_blue.interp(black, 0.9),
            title: base_blue.interp(black, 0.8),
            text: white
        };
    };

})();

function setColorScheme(sc) {
    var css_suffix = null;
    if(sc == "black") {
        Colors.setBlackScheme();
        css_suffix = "b";
    }
    if(sc == "white") {
        Colors.setWhiteScheme();
        css_suffix = "w";
    }
    $(".colorscheme-css").each(function() {
        $(this).attr("href", $(this).attr("href-" + css_suffix));
    });
    $("#timeline")[0].set_colorscheme(sc);
};

setColorScheme("white");

WeiboEvents.namedListen("colorscheme", "si", function(cs) {
    setColorScheme(cs);
    WeiboEvents.raise("colorscheme-changed");
    redraw_graphs();
    update_wordcloud();
});
