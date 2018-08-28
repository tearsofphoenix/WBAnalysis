// # Weibo Events

// Detect canvas support.
if(!document.createElement("canvas").getContext) {
    document.getElementById("browser-warning").style.display = "block";
}

var G_duration = 5 * 86400;
var G_enable_task = false;

// Global function entries.
var set_highlight_user = function(uid) {};
var do_select_user_nodes = function(uid) {};
var set_hover_node = function(id) {};
var do_select_tweet = function(id) {};

var on_canvas_size_changed = function() {};

// Session unique key.
var session_unique_key = sha1_str(Math.random() + Math.random());

var current_loaded_data = null;

{{include: we-server.js}}
{{include: we-interface.js}}

// Initialize system with data.
var SYSTEM_INITIALIZE = function(data, data_fields, sinit_callback_function) {

// Include inline helpers.
{{include: we-helpers.js}}

// Prepare data.
{{include: we-prepare.js}}

// Layout methods.
{{include: we-layout.js}}
{{include: we-layout-curves.js}}

var current_node_size = "followers";
var current_x_axis = "linear";

// Current drawing info(region, mapping(t => x position))
var current_map;

// Node scale, external.
var current_node_scale = 1;

// Extra charts
var extra_charts = [];
G_extra_charts = extra_charts;

// Node filter.
var node_filter = function(node) { return true; };
// Node color.
var node_color = function(node) { return null; };

// Interface event handlers.
WeiboEvents.namedListen("layout", "si", function(method) {
    if(method == "tree") {
        layout_tree(data_tree);
    } else if(method == "sail-span") {
        layout_span(data_tree);
    } else if(method == "curves") {
        layout_span(data_tree);
        weibo_curves.layout(data_tree);
    } else {
        WeiboEvents.set("action", "pan");
        layout_circular(data_tree);
    }
    log_user_action("layout", { value: method });
    set_zooming();
});
WeiboEvents.namedListen("node-size", "si", function(node_size) {
    current_node_size = node_size;
    set_zooming(current_map.t0, current_map.t1, current_map.y0, current_map.y1);
    redraw_graphs();
    log_user_action("node-size", { value: current_node_size });
});
WeiboEvents.namedListen("node-color", "si", function(color) {
    if(color == "uniform") {
        node_color = function(node) { return null; };
    } else if(color == "gender") {
        node_color = function(node) {
            if(node.gender == "m") return Colors.nodeColor.male;
            if(node.gender == "f") return Colors.nodeColor.female;
            return null;
        }
        reset_keywords();
    } else if(color == "verified") {
        node_color = function(node) {
            if(node.verified) return Colors.nodeColor.verified;
            return null;
        }
        reset_keywords();
    } else if(color == "level") {
        node_color = function(node) {
            return Colors.nodeColor.level(node.level);
        }
        reset_keywords();
    }
    log_user_action("node-color", { value: color });
    redraw_graphs();
});
WeiboEvents.namedListen("x-axis", "si", function(x_axis) {
    current_x_axis = x_axis;
    log_user_action("x-axis", { value: current_x_axis });
    restore_zooming();
});

{{include: we-render.js}}

set_emotion_color = function() {
    var gradient = [ // diverging.
        [0,229, 124, 94],
        [1/6,148, 97, 45],
        [2/6,77, 65, 20],
        [3/6,25, 30, 5],
        [4/6,41, 70, 35],
        [5/6,43, 114, 80],
        [1,28, 160, 142]
    ];
    var interp = function(idx, t) {
        for(var i = 0; i < gradient.length - 1; i++) {
            var t1 = gradient[i][0];
            var t2 = gradient[i+1][0];
            if(t >= t1 && t <= t2) {
                var tt = (t - t1) / (t2 - t1);
                var aa = gradient[i][idx];
                var bb = gradient[i+1][idx];
                return parseInt(aa * (1 - tt) + bb * tt);
            }
        }
        return gradient[gradient.length - 1][idx];
    };
    var colormap = function(t) {
        if(t > 1) t = 1; if(t < 0) t = 0;
        var r = interp(1, t);
        var g = interp(2, t);
        var b = interp(3, t);
        return [r, g, b].join(",");
    };
    var emotion_color = function(node) {
        if(node.emotion === undefined || node.emotion === null) return null;
        var x = -node.emotion + 0.5;
        if(x < 0) x = 0;
        if(x > 1) x = 1;
        return WeiboEvents.parseColorINT(colormap(x));

    };
    node_color = emotion_color;
    redraw_graphs();
};

var set_zooming = function(t0, t1, y0, y1, n_scale) {
    set_current_map(t0, t1, y0, y1, n_scale);
    draw_graph();
    draw_canvas_graph_over();
}

var restore_zooming = function() {
    previous_ranges = [];
    set_zooming();
}

do_change_userlist_sort = function(sort, sender) {
    userlist_sort = sort;
    log_user_action("userlist-sort", { value: userlist_sort });
    update_list();
};

var should_neglect_click = false;

WeiboEvents.namedOn("graph-mousedown", "si", function(e) {
    should_neglect_click = false;
    e.offsetX = e.pageX - $("#graph").offset().left;
    e.offsetY = e.pageY - $("#graph").offset().top;

    for(var i = 0; i < extra_charts.length; i++) {
        var c = extra_charts[i];
        var r = (function(c) {
            var x = c.x, y = c.y, w = c.img.get(0)._width + 5, h = c.img.get(0)._height + 32;
            if(e.offsetX >= x && e.offsetX <= x + w && e.offsetY >= y && e.offsetY <= y + h) {
                var x0 = x, y0 = y;
                var px = e.offsetX - x, py = e.offsetY - y;
                if(py >= 3 && py <= 21) {
                    var tx = (w - 3 - px) / 21;
                    if(tx >= 0 && tx <= 1) {
                        // Close button, remove.
                        var idx = extra_charts.indexOf(c);
                        extra_charts.splice(idx, 1);
                        draw_sketchpad_overlay();
                        return true;
                    }
                }
                beginDragging(function(nx, ny) {
                    c.x = x0 - e.offsetX + nx;
                    c.y = y0 - e.offsetY + ny;
                    draw_sketchpad_overlay();
                });
                return true;
            }
        })(c);
        if(r) return;
    }

    // Highlight nodes?
    for(var i in highlight_nodes) {
        var id = highlight_nodes[i];
        var node = data_tree.nodes[id];
        if(highlight_nodes_expandall || node.id == highlight_nodes_first) {
            if(e.offsetX >= node.box_location[0] && e.offsetY >= node.box_location[1] &&
               e.offsetX <= node.box_location[0] + node.box_location[2] &&
               e.offsetY <= node.box_location[1] + node.box_location[3]) {
                should_neglect_click = true;

                var x0 = node.box_offset_x;
                var y0 = node.box_offset_y;

                var nhl_nodes = [];
                nhl_nodes.push(id);
                for(var i = 0; i < highlight_nodes.length; i++) {
                    if(id != highlight_nodes[i])
                        nhl_nodes.push(highlight_nodes[i]);
                }
                highlight_nodes = nhl_nodes;

                var px = e.offsetX - node.box_location[0], py = e.offsetY - node.box_location[1];
                if(py >= 3 && py <= 21) {
                    var tx = (210 - 3 - px) / 21;
                    if(tx >= 0 && tx <= 1) {
                        // Close button, remove.
                        var new_highlight_nodes = [];
                        if(node.id == highlight_nodes_first)
                            highlight_nodes_first = null;
                        for(var j in highlight_nodes) {
                            var id = highlight_nodes[j];
                            if(id != node.id)
                                new_highlight_nodes.push(id);
                        }
                        highlight_nodes = new_highlight_nodes;
                        draw_canvas_graph_over();
                        return;
                    }
                    if(tx >= 1 && tx <= 2) {
                        // Open new link.
                        window.open(Weibo_miduid2url(node.mid, node.uid));
                        return;
                    }
                }

                beginDragging(function(nx, ny) {
                    node.box_offset_x = x0 - e.offsetX + nx;
                    node.box_offset_y = y0 - e.offsetY + ny;
                    draw_canvas_graph_over();
                });

                draw_canvas_graph_over();
                return;
            }
        }
    }

    // Mouse action.
    var action = WeiboEvents.get("action");
    var r_t0 = current_map.t0;
    var r_t1 = current_map.t1;
    var r_y0 = current_map.y0;
    var r_y1 = current_map.y1;
    var dragging_node = null;

    if(action == "pan" && WeiboEvents.get("layout") == 'circular') {
        var node_id = find_node_with_pixel(e.offsetX, e.offsetY);
        if(node_id) {
            dragging_node = node_id;
            action = "move-node";
        }
    }

    var mouseX0 = e.offsetX;
    var mouseY0 = e.offsetY;

    cg_dragging = {
        action: action,
        x0: mouseX0,
        y0: mouseY0,
        dragging_node: dragging_node
    };

    beginDragging(function(mouseX, mouseY) {
        cg_dragging.x1 = mouseX;
        cg_dragging.y1 = mouseY;
        if(action == "zoom") {
            if(WeiboEvents.get("layout") == "circular") {
                var scale = (view_width - 20) / (view_height - 36);
                if(Math.abs(mouseY - mouseY0) > Math.abs(mouseX - mouseX0))
                    mouseX = mouseX0 + scale * Math.abs(mouseY - mouseY0) * (mouseX > mouseX0 ? 1 : -1);
                else
                    mouseY = mouseY0 + 1 / scale * Math.abs(mouseX - mouseX0) * (mouseY > mouseY0 ? 1 : -1);
            }

            draw_canvas_graph_over();
        }
        if(action == "pan") {
            var dx = mouseX - mouseX0;
            var dy = mouseY - mouseY0;
            $("#graph-inner").css('left', dx + "px").css('top', dy + "px");
        }
        if(action == "move-node") {
            var dx = mouseX - mouseX0;
            var dy = mouseY - mouseY0;
            draw_canvas_graph_over();
        }
        should_neglect_click = true;
    }, function(mouseX, mouseY) {
        if(action == "zoom" && mouseX != undefined) {
            var x0 = mouseX0;
            var x1 = mouseX;
            var y0 = mouseY0;
            var y1 = mouseY;
            if(x0 != x1 && y0 != y1) {
                if(x1 < x0) {
                    var t = x1; x1 = x0; x0 = t;
                }
                if(y1 < y0) {
                    var t = y1; y1 = y0; y0 = t;
                }
                var t0 = current_map.icmap(x0);
                var t1 = current_map.icmap(x1);
                y0 = current_map.iymap(y0);
                y1 = current_map.iymap(y1);
                previous_ranges.push([current_map.t0, current_map.t1, current_map.y0, current_map.y1]);
                set_zooming(t0, t1, y0, y1);
            }
        }
        if(action == "pan" && mouseX != undefined) {
            var tshift = current_map.icmap(mouseX) - current_map.icmap(mouseX0);
            var yshift = current_map.iymap(mouseY) - current_map.iymap(mouseY0);
            if(tshift != 0 && yshift != 0) {
                previous_ranges.push([current_map.t0, current_map.t1, current_map.y0, current_map.y1]);
                set_zooming(r_t0 - tshift, r_t1 - tshift,
                            r_y0 - yshift, r_y1 - yshift);
                $("#graph-inner").css('left', "0px").css('top', "0px");
            }
        }
        if(action == "move-node" && mouseX != undefined) {
            var shall_move = true;
            if(!data_tree.nodes[dragging_node].circular_expand) {
                var dx = mouseX - mouseX0;
                var dy = mouseY - mouseY0;
                var node = data_tree.nodes[dragging_node];
                if(dx * dx + dy * dy > 10 * 10) {
                    node.circular_expand = true;
                    layout_circular_recompute();
                    log_user_action("circular-expand-node", { id: node.id });
                } else {
                    shall_move = false;
                }
            } else {
                var dx = mouseX - mouseX0;
                var dy = mouseY - mouseY0;
                if(dx == 0 && dy == 0) shall_move = false;
            }
            if(shall_move) {
                var tshift = current_map.icmap(mouseX) - current_map.icmap(mouseX0);
                var yshift = current_map.iymap(mouseY) - current_map.iymap(mouseY0);
                var shift_children = function(node) {
                    node.x += tshift;
                    node.y += yshift;
                    for(var i in node.children) {
                        var cnode = data_tree.nodes[node.children[i]];
                        if(!cnode.circular_expand)
                            shift_children(cnode);
                    }
                };
                shift_children(data_tree.nodes[dragging_node]);
                log_user_action("circular-move-node", { position: layout_circular_get_position(data_tree.nodes[dragging_node]) });
                redraw_graphs();
            }
        }
        cg_dragging = null;
        draw_canvas_graph_over();
    });

    draw_canvas_graph_over();
});

set_zooming();

WeiboEvents.namedOn("keydown", "si", function(e) {
    if(e.keyCode == 40) {   // down
        if(hover_node != undefined) {
            var par = data_tree.nodes[hover_node].parent;
            var idx = data_tree.nodes[par].children.indexOf(hover_node);
            if(idx != -1 && idx - 1 >= 0) {
                hover_node = data_tree.nodes[par].children[idx - 1];
            }
        }
    }
    if(e.keyCode == 38) {   // up
        if(hover_node != undefined) {
            var par = data_tree.nodes[hover_node].parent;
            var idx = data_tree.nodes[par].children.indexOf(hover_node);
            if(idx != -1 && idx + 1 < data_tree.nodes[par].children.length) {
                hover_node = data_tree.nodes[par].children[idx + 1];
            }
        }
    }
    if(e.keyCode == 37) {   // left
        if(hover_node != undefined) {
            var par = data_tree.nodes[hover_node].parent;
            if(par != undefined)
                hover_node = par;
        }
    }
    if(e.keyCode == 39) {   // right
        if(hover_node != undefined && data_tree.nodes[hover_node] != undefined) {
            var chs = data_tree.nodes[hover_node].children;
            if(data_tree.nodes[hover_node]._current_hover_children != undefined) {
                hover_node = data_tree.nodes[hover_node]._current_hover_children;
            }
            else if(chs != undefined && chs.length > 0) {
                hover_node = chs[0];
            }
        }
    }
    if(e.keyCode == 32) {   // space
        if(hover_node != undefined && data_tree.nodes[hover_node] != undefined)
            add_highlight_node(hover_node)
    }
    draw_canvas_graph_over();
});

WeiboEvents.namedOn("toplayer-mousemove", "si", function(e) {
    if(cg_dragging == undefined) {
        e.offsetX = e.pageX - $("#graph").offset().left;
        var tt = current_map.itmap(e.offsetX);
        if(WeiboEvents.get("layout") == "sail-span")
            $("#timeline")[0].setFocusTime(tt);
        else
            $("#timeline")[0].setFocusTime();
    }
});

WeiboEvents.namedOn("reset-zooming", "si", function() {
    set_zooming();
});

WeiboEvents.namedOn("restore-zooming", "si", function() {
    if(previous_ranges.length > 0) {
        var r = previous_ranges[previous_ranges.length - 1];
        previous_ranges.pop();
        set_zooming(r[0], r[1], r[2], r[3]);
    }
    else set_zooming();
});

var do_zoom_in_or_out = function(sign) {
    var dt = sign * (current_map.t1 - current_map.t0);
    var t0 = current_map.t0 - dt;
    var t1 = current_map.t1 + dt;
    var dy = sign * (current_map.y1 - current_map.y0);
    var y0 = current_map.y0 - dy;
    var y1 = current_map.y1 + dy;
    previous_ranges.push([current_map.t0, current_map.t1, current_map.y0, current_map.y1]);
    set_zooming(t0, t1, y0, y1);
};
WeiboEvents.namedOn("zoom-in", "si", function() {
    do_zoom_in_or_out(-1/7);
    // -1/7 = (1/(0.2 * 2 + 1) - 1) / 2
});
WeiboEvents.namedOn("zoom-out", "si", function() {
    do_zoom_in_or_out(0.2);
});

WeiboEvents.namedOn("animation", "si", function() {
    var e = enable_animation;
    enable_animation = true;
    redraw_graphs();
    enable_animation = e;
});

var find_node_with_pixel = function(px, py) {
    var candidates = pixel_select_buffer[py * view_width + px];
    if(candidates == undefined) return undefined;
    var mini = undefined;
    var mind = 1e100;
    for(var ci in candidates) {
        var i = candidates[ci];
        if(highlighten_nodes != undefined) {
            if(highlighten_nodes[i] == undefined) continue;
        }
        var n = data_tree.nodes[i];
        var x = current_map.tmap(n.x);
        var y = current_map.ymap(n.y);
        var d2 = (x - px) * (x - px) + (y - py) * (y - py);
        d2 = Math.sqrt(d2) - current_map.get_w(n);
        if(d2 < mind) {
            if(!node_filter(n)) {
                continue;
            }
            mini = i;
            mind = d2;
        }
    }
    return mini;
}

var add_highlight_node = function(id) {
    var found = false;
    for(var i in highlight_nodes) {
        if(id == highlight_nodes[i]) {
            found = true;
            highlight_nodes_first = id;
        }
    }
    if(!found) {
        highlight_nodes.push(id);
        highlight_nodes_first = id;
    }
    if(highlight_logs.length == 0 || highlight_logs[highlight_logs.length - 1] != id) {
        highlight_logs.push(id);
    }
    log_user_action("select", { node: id });
    highlight_user = undefined;
}

do_select_tweet = function(node) {
    add_highlight_node(node);
    draw_canvas_graph_over();
    if(on_highlight_nodes_changed) on_highlight_nodes_changed();
}

do_select_user_nodes = function(uid) {
    highlight_nodes = [];
    highlight_nodes_first = undefined;
    for(var i in authors[uid]) {
        highlight_nodes.push(authors[uid][i]);
        highlight_nodes_first = authors[uid][i];
    }
    draw_canvas_graph_over();
    if(on_highlight_nodes_changed) on_highlight_nodes_changed();
}

WeiboEvents.namedOn("graph-click", "si", function(e) {
    if(should_neglect_click) return;
    e.offsetX = e.pageX - $("#graph").offset().left;
    e.offsetY = e.pageY - $("#graph").offset().top;
    var mini = find_node_with_pixel(e.offsetX, e.offsetY);
    if(mini != undefined) {
        add_highlight_node(mini);
    } else {
        highlight_nodes_first = undefined;
        highlight_user = undefined;
    }
    draw_canvas_graph_over();
    if(on_highlight_nodes_changed) on_highlight_nodes_changed();
    $("#timeline")[0].safe_redraw();
});

WeiboEvents.namedOn("graph-contextmenu", "si", function(e) {
    e.offsetX = e.pageX - $("#graph").offset().left;
    e.offsetY = e.pageY - $("#graph").offset().top;
    if(WeiboEvents.get("layout") == "circular") {
        var node_id = find_node_with_pixel(e.offsetX, e.offsetY);
        if(node_id) {
            var node = data_tree.nodes[node_id];
            if(node.circular_expand) {
                if(node.parent) {
                    node.circular_expand = false;
                    var pnode = node;
                    while(pnode && !pnode.circular_expand) {
                        pnode = data_tree.nodes[pnode.parent];
                    }
                    if(pnode) {
                        layout_circular_recompute();
                        redraw_graphs();
                    }
                    log_user_action("circular-collapse-node", { id: node.id });
                }
            }
        }
    }
    e.preventDefault();
});

WeiboEvents.namedOn("graph-mousemove", "si", function(e) {
    e.offsetX = e.pageX - $("#graph").offset().left;
    e.offsetY = e.pageY - $("#graph").offset().top;
    hover_node = find_node_with_pixel(e.offsetX, e.offsetY);
    draw_canvas_graph_over();
});

WeiboEvents.namedListen("full-selection", "si", function(val) {
    highlight_nodes_expandall = val;
    draw_canvas_graph_over();
});

WeiboEvents.namedOn("clear-selection", "si", function() {
    highlight_nodes = [];
    highlight_nodes_first = undefined;
    log_user_action("deselect-all", {});
    draw_canvas_graph_over();
    if(on_highlight_nodes_changed) on_highlight_nodes_changed();
    $("#timeline")[0].safe_redraw();
});


$("#timeline")[0].onmousetchanged = function() {
    timeline_mouse_t = this.mouse_t;
    draw_canvas_graph_over();
}

var make_distribution_canvas = function(atoms, css_width, css_height) {
    var node_canvas = document.createElement('canvas');
    var node_canvas_ctx = node_canvas.getContext('2d');
    node_canvas.width = css_width * view_scaling;
    node_canvas.height = css_height * view_scaling;
    node_canvas._width = css_width;
    node_canvas._height = css_height;

    node_canvas_ctx.setTransform(view_scaling, 0, 0, view_scaling, 0, 0);

    $(node_canvas).css({
        width: css_width + "px",
        height: css_height + "px"
    });
    var m = 8;
    var w = 120;
    var margin = m / (w - 2 * m);
    pkuvis_distribution_view(atoms, {
        canvas: node_canvas, context: node_canvas_ctx,
        y_range: [0, css_height],
        width: css_width,
        stroke_style: "rgba(0,0,0,0)",
        fill_style: Colors.histogram.fill.ofAlpha(0.7).toRGBA(),
        return_params: true,
        start: 0 - margin, end: 1 + margin
    });
    return $(node_canvas);
};

// Sliders
var filter_canvas_width = 120;
var filter_canvas_height = 12;
$("#ctrl-filter-followers")[0].filter_value = 0;
$("#ctrl-filter-followers")[0].onvaluechanged = function() {
    var filter_v = Math.exp(this.slider_value * 16) - 1;
    this.filter_value = filter_v;
    $("#ctrl-filter-followers-value").html(">= " + Math.round(filter_v));
}
$("#ctrl-filter-followers").append(make_distribution_canvas(atoms.map(function(x) {
    return Math.log(x.followers_count + 1) / 16;
}), filter_canvas_width, filter_canvas_height));

$("#ctrl-filter-reposts")[0].filter_value = 0;
$("#ctrl-filter-reposts")[0].onvaluechanged = function() {
    var filter_v = 0;
    filter_v = 200 * Math.pow(this.slider_value, 2);
    this.filter_value = filter_v;
    $("#ctrl-filter-reposts-value").html(">= " + Math.round(filter_v));
}
$("#ctrl-filter-reposts").append(make_distribution_canvas(atoms.filter(function(x) { return x.children.length != 0; }).map(function(x) {
    return Math.pow(x.children.length / 200, 0.5);
}), filter_canvas_width, filter_canvas_height));

$("#ctrl-filter-text-length")[0].filter_value = 0;
$("#ctrl-filter-text-length")[0].onvaluechanged = function() {
    var filter_v = 0;
    filter_v = 200 * Math.pow(this.slider_value, 2);
    this.filter_value = filter_v;
    $("#ctrl-filter-text-length-value").html(">= " + Math.round(filter_v));
}
$("#ctrl-filter-text-length").append(make_distribution_canvas(atoms.map(function(x) {
    return Math.pow(x.text.length / 200, 0.5);
}), filter_canvas_width, filter_canvas_height));

var update_filter = function() {
    var f_followers_count = $("#ctrl-filter-followers")[0].filter_value;
    var f_reposts = $("#ctrl-filter-reposts")[0].filter_value;
    var f_textlength = $("#ctrl-filter-text-length")[0].filter_value;
    log_user_action("filter", { followers_count: f_followers_count, reposts: f_reposts, length: f_textlength });
    var t0 = -1e100;
    var t1 = 1e100;
    if($("#timeline")[0].range_t0 && $("#timeline")[0].range_t1) {
        t0 = $("#timeline")[0].range_t0;
        t1 = $("#timeline")[0].range_t1;
    }
    node_filter = function(node) {
        return node.followers_count >= f_followers_count &&
               node.children.length >= f_reposts &&
               node.text.length >= f_textlength &&
               node.t >= t0 && node.t <= t1;
    };
    draw_graph();
};

$("#ctrl-node-size")[0].slider_set(0.5);
$("#ctrl-node-size")[0].onvaluechanged = function() {
    var scale = Math.exp(($("#ctrl-node-size")[0].slider_value - 0.5) * 3);
    $("#ctrl-node-size-value").html(scale.toFixed(2) + "x");
}
$("#ctrl-node-size")[0].onvaluechanged_up = function() {
    var scale = Math.exp(($("#ctrl-node-size")[0].slider_value - 0.5) * 3);
    current_node_scale = scale;
    redraw_graphs();
}

$("#ctrl-expand-threshold")[0].slider_set(45 / 495);
$("#ctrl-expand-threshold")[0].onvaluechanged = function() {
    var val = parseInt($("#ctrl-expand-threshold")[0].slider_value * 495 + 5);
    $("#ctrl-expand-threshold-value").html(val);
}
$("#ctrl-expand-threshold")[0].onvaluechanged_up = function() {
    var val = parseInt($("#ctrl-expand-threshold")[0].slider_value * 495 + 5);
    layout_circular_threshold = val;
    if(WeiboEvents.get("layout") == "curves") {
        weibo_curves.set("threshold_split", val);
        WeiboEvents.set("layout", "curves");
    }
    else WeiboEvents.set("layout", "circular");
}
$("#ctrl-filter-text-length")[0].onvaluechanged_up =
$("#ctrl-filter-reposts")[0].onvaluechanged_up =
$("#ctrl-filter-followers")[0].onvaluechanged_up = function() {
    update_filter();
};
$("#timeline")[0].onrangechanged = function() {
    update_filter();
}

// Create userlist.
var userlist_sort = "retweets";
var refresh_list = function(umap, target) {
    var uids = [];
    var ht_rankselect = '<span class="info">';
    ht_rankselect += ' <span class="info-followers sort-followers" onclick="do_change_userlist_sort(\'followers\', this);">粉丝</span>';
    ht_rankselect += ' <span class="info-posts sort-posts" onclick="do_change_userlist_sort(\'posts\', this);">微博数</span>';
    ht_rankselect += ' <span class="info-reposts sort-retweets" onclick="do_change_userlist_sort(\'retweets\', this);">被转数</span>';
    ht_rankselect += '</span>';
    var ht = '<div class="header">用户列表:' + ht_rankselect + '</div>';
    if(target != undefined) {
        ht = '<div class="header">我的好友:</div>';
    }
    for(var i in authors) {
        if(umap == undefined || umap[i] != undefined)
            uids.push(i);
    }
    if(userlist_sort == "followers") {
        uids.sort(function(a, b) {
            return authors_info[b].followers_count - authors_info[a].followers_count;
        });
    } else if(userlist_sort == "retweets") {
        uids.sort(function(a, b) {
            if(authors_info[b].reposts == authors_info[a].reposts)
                return authors_info[b].followers_count - authors_info[a].followers_count;
            return authors_info[b].reposts - authors_info[a].reposts;
        });
    } else {
        uids.sort(function(a, b) {
            if(authors_info[b].nodes == authors_info[a].nodes)
                return authors_info[b].followers_count - authors_info[a].followers_count;
            return authors_info[b].nodes - authors_info[a].nodes;
        });
    }
    for(var i in uids) {
        if(i > 100) break;
        var uid = uids[i];
        ht += '<div class="userinfo" ondblclick="do_select_user_nodes(\'' + uid + '\')" onclick="set_highlight_user(\'' + uid + '\')"><span class="name">' + authors_info[uid].screen_name + '</span><span class="info"><span class="info-followers">' + authors_info[uid].followers_count + '</span> <span class="info-posts">' + authors[uid].length + '</span> <span class="info-reposts">' + authors_info[uid].reposts + '</span></div>';
    }
    if(target == undefined) {
        $("#user-list").html(ht);
    } else {
        $("#" + target).html(ht);
    }
    $("#user-lists .header .info > span.sort-" + userlist_sort).addClass("active");
};

var update_list = function() {
    refresh_list();
};
refresh_list();

var S_result;

{{include: we-saveload.js}}

{{include: we-wordcloud.js}}

{{include: we-charts.js}}

perform_xdcall = function(info) {
    var rslt = { };
    if(info.action == "highlight-users") {
        highlight_nodes = [];
        highlight_nodes_first = undefined;
        info.uids.forEach(function(uid) {
            for(var i in authors[uid]) {
                highlight_nodes.push(authors[uid][i]);
                highlight_nodes_first = authors[uid][i];
            }
        });
        console.log(highlight_nodes);
        draw_canvas_graph_over();
        if(on_highlight_nodes_changed) on_highlight_nodes_changed();
        rslt.status = "success";
    }
    return rslt;
};

G_export_data_layout = function() {
    return data_tree;
};

WeiboEvents.set("layout", WeiboEvents.get("layout"));
$("#initial-load-status").fadeOut();

if(sinit_callback_function) sinit_callback_function();
// ==================================== SYSTEM_INITIALIZE
};

$(document).ready(function() {
    G_zxcname = "sample";
});
// End of Code.
