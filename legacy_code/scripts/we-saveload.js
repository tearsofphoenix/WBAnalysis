// Draw graph summary.

var draw_statistics_graphs = function() {
    var extra_charts = [];
    var wmax = 0;
    var y = 5;
    $("#charts canvas").each(function() {
        var w = $(this).get(0)._width;
        var h = $(this).get(0)._height;
        extra_charts.push({
            img: $(this),
            x: 5, y: y,
            w: w, h: h,
            title: $(this).prev().text()
        });
        y += h + 32 + 5;
        if(wmax < w + 5) wmax = w + 5;
    });
    var canvas = createCanvasFixedWidthHeight(wmax + 10, y + 5);
    var ctx = canvas.getContext("2d");
    extra_charts.forEach(function(c) {
        var canvas = c.img.get(0);
        var w = canvas._width + 5, h = canvas._height, x = c.x, y = c.y;
        // Main rect
        ctx.strokeStyle = Colors.highlightBoxCold.border.toRGBA();
        ctx.fillStyle = Colors.highlightBoxCold.fill.toRGBA();
        ctx.fillRect(x, y, w, h + 32);
        // Buttons.
        var draw_button = function(index, text) {
            ctx.save();
            ctx.font = "12px WeiboEventsIcons";
            ctx.fillStyle = Colors.highlightBoxCold.fill.toRGBA();
            ctx.fillRect(x + w - index * 21 + 3 - 24, y + 3, 18, 18);
            ctx.textAlign = "center";
            ctx.fillStyle = Colors.foreground.toRGBA();
            ctx.fillText(text, x + w - index * 21 + 3 - 24 + 9, y + 3 + 13);
            ctx.restore();
        };
        var y0 = y + 16;
        // Title rect
        ctx.fillStyle = Colors.highlightBoxCold.title.toRGBA();
        ctx.fillRect(x, y, w, 24);
        // Name
        ctx.fillStyle = Colors.foreground.toRGBA();
        ctx.font = "bold 12px Helvetica";
        ctx.textAlign = "left";
        ctx.fillText(c.title, x + 8, y0);
        ctx.strokeRect(x, y, w, h + 32);
        ctx.drawImage(canvas, x, y + 28, canvas._width, canvas._height);
        draw_button(0, FONT_WeiboEventsIcons["tools-cross"]);
    });
    return canvas;
};

var draw_graph_summary = function() {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext('2d');
    var canvas_timeline = $("#timeline")[0].timeline_canvas;
    var canvas_stats = draw_statistics_graphs();
    var W = canvas_graph.width;
    var H = canvas_graph.height + canvas_timeline.height;
    H = Math.max(H, canvas_stats.height);
    W += canvas_stats.width;
    canvas.width = W;
    canvas.height = H;
    ctx.fillStyle = Colors.background.toRGBA();
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(canvas_graph, 0, 0, canvas_graph.width, canvas_graph.height);
    ctx.drawImage(canvas_graph_nodes, 0, 0, canvas_graph.width, canvas_graph.height);
    ctx.drawImage(canvas_overlay, 0, 0, canvas_graph.width, canvas_graph.height);
    ctx.drawImage(canvas_graph_over_lines, 0, 0, canvas_graph.width, canvas_graph.height);
    ctx.drawImage(canvas_graph_over, 0, 0, canvas_graph.width, canvas_graph.height);

    if($("#graph-sketchpad").is(':visible')) {
        ctx.drawImage($("#graph-sketchpad")[0].sketchpad_canvas, 0, 0, canvas_graph.width, canvas_graph.height);
    }

    ctx.fillRect(0, canvas_graph.height, canvas_timeline.width, canvas_timeline.height);
    ctx.drawImage(canvas_timeline, 0, canvas_graph.height, canvas_timeline.width, canvas_timeline.height);
    ctx.drawImage(canvas_stats, canvas_graph.width, 0, canvas_stats.width, canvas_stats.height);
    ctx.setTransform(view_scaling, 0, 0, view_scaling, 0, 0);
    ctx.textAlign = "right";
    ctx.fillStyle = Colors.foreground.toRGBA();
    ctx.font = "12px Helvetica";
    ctx.fillText(G_zxcname + " - 北京大学PKUVIS微博可视分析工具 from vis.pku.edu.cn/weibova", view_width - 10, 14);

    return canvas.toDataURL();
};
G_export_view = draw_graph_summary;

var save_user_result = function() {
    var nodes = [];
    for(var i in highlight_nodes) {
        var node = data_tree.nodes[highlight_nodes[i]];
        nodes.push({
            id: highlight_nodes[i],
            box_offset_x: node.box_offset_x,
            box_offset_y: node.box_offset_y
        });
    }
    var region = {
        t0: current_map.t0,
        t1: current_map.t1,
        y0: current_map.y0,
        y1: current_map.y1,
        height_span: current_map.iymap(view_height) - current_map.iymap(0)
    };
    var rslt = {
        event: G_zxcname,
        uid: G_userid,
        uname: G_username,
        nodes: nodes,
        region: region,
        layout: WeiboEvents.get("layout"),
        settings: {
            node_size: WeiboEvents.get("node-size"),
            node_color: WeiboEvents.get("node-color"),
            x_axis: WeiboEvents.get("x-axis"),
            expand_all: WeiboEvents.get("full-selection"),
            current_selection: highlight_nodes_first,
            colorscheme: WeiboEvents.get("colorscheme")
        },
        keywords: selected_keywords
    };
    if(WeiboEvents.get("layout") == 'circular') {
        rslt.circular_skeleton = layout_circular_save_skeleton();
    }
    if($("#graph-sketchpad").is(":visible")) {
        rslt.sketch = $("#graph-sketchpad")[0].sketchpad_export();
    }
    return rslt;
};

var load_user_result = function(dat) {
    highlight_nodes = [];
    for(var i in dat.nodes) {
        var id = dat.nodes[i].id;
        highlight_nodes[i] = dat.nodes[i].id;
        data_tree.nodes[id].box_offset_x = dat.nodes[i].box_offset_x;
        data_tree.nodes[id].box_offset_y = dat.nodes[i].box_offset_y;
    }
    WeiboEvents.set("node-size", dat.settings.node_size);
    WeiboEvents.set("node-color", dat.settings.node_color);
    WeiboEvents.set("x-axis", dat.settings.x_axis);
    highlight_nodes_first = dat.settings.current_selection;

    if(dat.layout) {
        WeiboEvents.set("layout", dat.layout);
        if(dat.layout == "circular" && dat.circular_skeleton) {
            layout_circular_load_skeleton(dat.circular_skeleton);
        }
    } else {
        WeiboEvents.set("layout", WeiboEvents.get("layout"));
    }

    WeiboEvents.set("full-selection", dat.settings.expand_all);
    if(dat.settings.colorscheme)
        WeiboEvents.set("colorscheme", dat.settings.colorscheme);

    set_zooming(dat.region.t0, dat.region.t1, dat.region.y0, dat.region.y1);


    if(dat.region.height_span) {
        var new_height_span = current_map.iymap(view_height) - current_map.iymap(0);
        var scale_factor = 1.0 / (new_height_span / dat.region.height_span);
    }

    draw_canvas_graph_over();

    if(dat.keywords) {
        selected_keywords = dat.keywords;
        on_keywords_changed();
    }
    if(dat.sketch) {
        $("#graph-sketchpad")[0].sketchpad_import(dat.sketch);
        $("#graph-sketchpad").show();
        $("#btn-paint").addClass("active");
    }
};
G_save_result = save_user_result;
G_load_result = load_user_result;

submit_information = null;

WeiboEvents.namedOn("open-submit-box", "si", function() {
    $("#graph-sketchpad")[0].deselect();
    var p = beginPopup("submit-box");
    // Render the submit image.
    var img_dataurl = draw_graph_summary();

    submit_information = {};
    submit_information.user_result = save_user_result();
    submit_information.data = current_loaded_data;
    submit_information.image = img_dataurl;

    $("#submit-image").attr("src", img_dataurl);

    p.find('[for="text"]').val("#北京大学PKUVIS微博可视分析工具# (http://vis.pku.edu.cn/weibova/weiboevents ) 分析 " +
        root_nodes.slice(0, 5).map(function(id) { return "@" + data_tree.nodes[id].username; }).join(" ")
        + " 的微博。");

    var p_info = p.find('[for="info"]');

    p.find('[for="submit-cancel"]').click(function() {
        submit_information = null;
        endPopup();
    });
    p.find('[for="submit-save-image"]').click(function() {
        window.open(img_dataurl);
    });
    var is_submitted = false;
    p.find('[for="submit-submit"]').click(function() {
        if(is_submitted) return;

        submit_information.text = p.find('[for="text"]').val().replace("\n", "");
        submit_information.post_weibo = p.find('[for="post-weibo"]').is(".active");

        // Here we submit the tweet.
        p_info.text("正在提交，请稍候...");
        $(this).addClass("inactive");
        var $this = $(this);
        is_submitted = true;

        // serverCall("submit", submit_information, function(data) {
        //     p_info.text("提交完成");
        //     submit_information = null;
        //     setTimeout(endPopup, 1000);
        // }, function() {
        //     is_submitted = false;
        //     p_info.text("提交失败。。。请重试，注意微博长度不要超过限制。");
        //     $this.removeClass("inactive");
        // });
    });
});

WeiboEvents.namedOn("open-suggestion-box", "si", function() {
    var p = beginPopup("suggestion-box");

    var p_info = p.find('[for="info"]');
    var is_submitted = false;

    p.find('[for="submit"]').click(function() {
        if(is_submitted) return;
        var $this = $(this);

        is_submitted = true;
        p_info.text("正在提交，请稍候...");
        $(this).addClass("inactive");

        // serverCall("suggestion", {
        //     text: p.find('[for="text"]').val()
        // }, function(data) {
        //     p_info.text("提交完成");
        //     setTimeout(endPopup, 1000);
        // }, function(msg) {
        //     is_submitted = false;
        //     p_info.text("提交失败(" + msg + ")。。。您还可以发邮件到 gxxvis@pku.edu.cn");
        //     $this.removeClass("inactive");
        // });
    });
    p.find('[for="cancel"]').click(function() {
        endPopup();
    });
});

// Automatic uploading.
var upload_status = {
    running: false
};
var uploaded_timestamp = 0;

var upload_current_results = function(r) {
    if(upload_status.running) return;
    var to_upload = [];
    for(var i in action_logs) {
        var act = action_logs[i];
        if(act.t > uploaded_timestamp) {
            to_upload.push(act);
        }
    }
    if(to_upload.length > 0) {
        upload_status.running = true;
        // serverCall("action-log", {
        //     actions: JSON.stringify(to_upload),
        //     user_result: JSON.stringify(save_user_result())
        // }, function() {
        //     uploaded_timestamp = to_upload[to_upload.length - 1].t;
        //     upload_status.running = false;
        // }, function() {
        //     upload_status.running = false;
        // });
    }
}

setInterval(upload_current_results, 5000);
