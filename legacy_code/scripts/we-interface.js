//$("#data-status").html("totally " + atoms.length + " statuses.");

function loadTimeline(data) {
    $("#timeline")[0].reloadData(data);
}

WeiboEvents.add("colorscheme", "string", "white");

WeiboEvents.add("layout", "string", "circular");
WeiboEvents.add("action", "string", "pan");

WeiboEvents.add("node-size", "string", "followers");
WeiboEvents.add("node-color", "string", "uniform");
WeiboEvents.add("x-axis", "string", "linear");

WeiboEvents.add("x-axis", "string", "linear");

WeiboEvents.add("full-selection", "bool", false);

$("#btn-word-cloud").click(function() {
    $("#word-cloud").toggle();
    $(this).toggleClass("active");
});

// Delegate events.
$(window).resize(function() {
    $("#right-box").css("top", $("#toolbar").height() + "px");
    WeiboEvents.raise("resize");
});
$(document).ready(function() {
    $(window).resize();
});
$(window).keydown(function(e) { WeiboEvents.raise("keydown", e); });
$("#graph").mousemove(function(e) { WeiboEvents.raise("graph-mousemove", e); });
$("#graph").mousedown(function(e) { WeiboEvents.raise("graph-mousedown", e); });
$("#graph").contextmenu(function(e) { WeiboEvents.raise("graph-contextmenu", e); });
$("#graph").click(function(e) { WeiboEvents.raise("graph-click", e); });
$("#canvas-graph-over").mousemove(function(e) { WeiboEvents.raise("toplayer-mousemove", e); });

$("[data-set]").each(function() {
    var $this = $(this);
    var target = $this.attr("data-set");
    $this.children("[data-value]").each(function() {
        $(this).click(function() {
            WeiboEvents.set(target, $(this).attr("data-value"));
        });
    });
    var update = function(value) {
        $this.children().each(function() {
            if(value == $(this).attr("data-value")) $(this).addClass("active");
            else $(this).removeClass("active");
        });
    };
    WeiboEvents.listen(target, update);
    update(WeiboEvents.get(target));
});
$("[data-toggle]").each(function() {
    var $this = $(this);
    var target = $this.attr("data-toggle");
    $(this).click(function() {
        WeiboEvents.set(target, ! WeiboEvents.get(target));
    });
    WeiboEvents.listen(target, function(val) {
        if(val) $this.addClass("active");
        else $this.removeClass("active");
    });
});
$("[data-raise]").each(function() {
    $(this).click(function() {
        WeiboEvents.raise($(this).attr("data-raise"));
    });
});
// Tooltip
$("[data-tooltip]").each(function() {
    var tooltip = null;
    var $this = $(this);
    var text = $this.attr("data-tooltip");
    $this.mouseenter(function() {
        if(tooltip) return;
        tooltip = $("<div />").addClass("tooltip").text(text);
        $("#tooltip-container").append(tooltip);
        var w = $(window).width();
        var dw = tooltip.outerWidth();
        var tw = $this.outerWidth();
        var l = $this.offset().left;
        var p = (l + tw / 2) / w;
        var l1 = l;
        var l2 = l - dw + tw;
        var l = l1 * (1 - p) + l2 * p;
        tooltip.css({
            left: l + "px",
            top: $this.offset().top + $this.height() + 8 + "px"
        });
    });
    $this.mouseleave(function() {
        if(tooltip) tooltip.remove();
        tooltip = null;
    });
});

function beginDragging(callback, callback_up) {
    var f_move = function(e) {
        e.offsetX = e.pageX - $("#graph").offset().left;
        e.offsetY = e.pageY - $("#graph").offset().top;
        if(callback) callback(e.offsetX, e.offsetY);
    };
    var f_up = function(e) {
        e.offsetX = e.pageX - $("#graph").offset().left;
        e.offsetY = e.pageY - $("#graph").offset().top;
        $(window).unbind("mousemove", f_move);
        $(window).unbind("mouseup", f_up);
        if(callback_up) callback_up(e.offsetX, e.offsetY);
    };
    $(window).bind("mousemove", f_move);
    $(window).bind("mouseup", f_up);
};

$(".scrollview").each(function() {
    $(this).ScrollView();
});

function beginPopup(id) {
    var div = $("<div />");
    $(".popup-contents").append(div);
    div.html($("#" + id).html());
    $("#popup-container").show();
    return div;

}

function endPopup() {
    $("#popup-container").hide();
    $(".popup-contents").html("");
}
