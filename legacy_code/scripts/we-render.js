// Initialize canvas.

{{include: we-colors.js}}

var canvas_graph = $("#canvas-graph")[0];
var canvas_graph_prev = $("#canvas-graph-previous-statistics")[0];
var canvas_graph_over = $("#canvas-graph-over")[0];
var canvas_graph_over_lines = $("#canvas-graph-over-lines")[0];
var canvas_graph_nodes = $("#canvas-graph-nodes")[0];
var canvas_overview = $("#canvas-overview")[0];
var canvas_overlay = $("#canvas-graph-overlay")[0];

var view_width = 1;
var view_height = 1;
var view_scaling = 1;

var set_canvas_size = function() {
    // Set sizes.

    var g = canvas_graph.getContext("2d");
    var dev_ratio = window.devicePixelRatio || 1;
    var backing_ratio = g.webkitBackingStorePixelRatio ||
                        g.mozBackingStorePixelRatio ||
                        g.msBackingStorePixelRatio ||
                        g.oBackingStorePixelRatio ||
                        g.backingStorePixelRatio || 1;
    var ratio = dev_ratio / backing_ratio;

    view_width = $("#graph").width();
    view_height = $("#graph").height();
    view_scaling = ratio;

    var set_wh = function(canvas) {
        canvas.width = view_width * ratio;
        canvas.height = view_height * ratio;
        canvas._width = view_width;
        canvas._height = view_height;
        $(canvas).css("width", view_width + "px");
        $(canvas).css("height", view_height + "px");
        canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    set_wh(canvas_graph);
    set_wh(canvas_graph);
    set_wh(canvas_graph_nodes);
    set_wh(canvas_graph_prev);
    set_wh(canvas_graph_over);
    set_wh(canvas_graph_over_lines);
    set_wh(canvas_graph_over);
    set_wh(canvas_overlay);
};

// Set current drawing state.
var set_current_map = function(t0, t1, _y0, _y1, n_scale) {
    var width = view_width;
    var height = view_height;
    if(t0 == undefined) t0 = 0;
    if(t1 == undefined) t1 = 1;
    if(_y0 == undefined) _y0 = 0;
    if(_y1 == undefined) _y1 = 1;
    if(WeiboEvents.get("layout") == "circular") {
        var tmid = (t1 + t0) / 2;
        var r = Math.abs(_y1 - _y0) * (width - 20) / (height - 36);
        t0 = tmid - r / 2;
        t1 = tmid + r / 2;
    }
    // default: linear mapping.
    var t2coordinate = function(t) {
        return (t - tmin) / (tmax - tmin);
    };
    var it2coordinate = function(c) {
        return c * (tmax - tmin) + tmin;
    };
    // using nonliner?
    if(current_x_axis == "nonlinear") {
        t2coordinate = nonlinear_tmap;
        it2coordinate = nonlinear_itmap;
    }
    if(WeiboEvents.get("layout") == "sail-span" || WeiboEvents.get("layout") == "curves") {
        // Set maps.
        var tmap = function(t) { // from time(unix timestamp) to x position.
            return (t2coordinate(t) - t0) / (t1 - t0) * (width - 20) + 10;
        };
        var itmap = function(x) { // inverse tmap.
            return it2coordinate((x - 10) / (width - 20) * (t1 - t0) + t0);
        };
    } else {
        var tmap = function(t) { // from time(unix timestamp) to x position.
            return ((t) - t0) / (t1 - t0) * (width - 20) + 10;
        };
        var itmap = function(x) { // inverse tmap.
            return ((x - 10) / (width - 20) * (t1 - t0) + t0);
        };
    }
    var icmap = function(x) { // inverse coordinate map.
        return (x - 10) / (width - 20) * (t1 - t0) + t0;
    };
    var ymap = function(y) { // from y value to y position.
        return (y - _y0) / (_y1 - _y0) * (height - 36) + 10;
    };
    var iymap = function(y) { // inverse ymap.
        return (y - 10) / (height - 36) * (_y1 - _y0) + _y0;
    };
/*
    if(WeiboEvents.get("layout") == "curves") {
        ymap = function(y) {
            return y;
        };
        iymap = function(y) {
            return y;
        };
    }
*/
    // Node width function.
    var area_ratio = Math.pow((t1 - t0) * (_y1 - _y0), 0.33);
    var node_scale = 1.5 / (0.5 + area_ratio) * Math.sqrt(6000 / atoms.length);
    if(n_scale != undefined) node_scale *= n_scale;
    var get_w;
    if(current_node_size == "retweets") {
        get_w = function(node) {
            return Math.log(2 + node.children.length / 10) * width / 1000 * node_scale * current_node_scale;
        };
    } else if(current_node_size == "comments") {
        get_w = function(node) {
            return Math.log(2 + node.comments_count / 10) * width / 1000 * node_scale * current_node_scale;
        };
    } else if(current_node_size == "followers") {
        get_w = function(node) {
            return Math.log(2 + node.followers_count / 100) * width / 2000 * node_scale * current_node_scale;
        }
    } else if(current_node_size == "uniform") {
        get_w = function(node) {
            return 2 * width / 1000 * node_scale * current_node_scale;
        }
    } else if(current_node_size == "posts") {
        get_w = function(node) {
            return Math.pow(authors_info[node.uid].reposts, 0.3) * width / 1000 * node_scale * current_node_scale;
        }
    } else {
        get_w = function(node) {
            return current_node_size(node) * node_scale * current_node_scale;
        }
    }
    // Set the current_map variable.
    current_map = {
        tmap : tmap, ymap: ymap,
        icmap: icmap,
        itmap : itmap,
        iymap : iymap,
        t2c: t2coordinate, it2c: it2coordinate,
        t0: t0, t1: t1, y0: _y0, y1: _y1,
        node_scale: node_scale,
        get_w: get_w
    };
    // log action "zoom"
    var logobj = {
        time: current_x_axis,
        t0: t0, t1: t1, y0: _y0, y1: _y1
    };
    if(true) {
        log_user_action("zoom", logobj);
    }
    if(WeiboEvents.get("layout") == "sail-span") {
        // Update timeline range.
        //$("#timeline")[0].setRange(current_map.it2c(current_map.t0), current_map.it2c(current_map.t1));
    } else {
        //$("#timeline")[0].setRange();
    }
    // Hide statistics graph.
    statistics_shown = false;
    $(canvas_graph_prev).hide();
    // Enable show stat button.
    $("#btn-show-stat").removeClass("active");
}

// Map: pixel => nodes.
var pixel_select_buffer = [];
var pixel_select_buffer_addnode = function(node) {
    var x = current_map.tmap(node.x);
    var y = current_map.ymap(node.y);
    var w = current_map.get_w(node);
    // fill pixel_select_buffer
    var pw = Math.ceil(w) + 6;
    var px = Math.round(x);
    var py = Math.round(y);
    var w2 = (w + 5) * (w + 5);
    for(var tx = -pw; tx <= pw; tx++) {
    for(var ty = -pw; ty <= pw; ty++) {
        var dist2 = (px + tx - x) * (px + tx - x) + (py + ty - y) * (py + ty - y);
        if(dist2 < w2)
        if(px + tx >= 0 && px + tx <= view_width)
        if(py + ty >= 0 && py + ty <= view_height) {
            if(pixel_select_buffer[px + tx + (py + ty) * view_width] == undefined)
                pixel_select_buffer[px + tx + (py + ty) * view_width] = [node.id];
            else
                pixel_select_buffer[px + tx + (py + ty) * view_width].push(node.id);
        }
    }
    }
};

var StepControl = function() {
    this.tasks = [];
};

StepControl.prototype.addTask = function(index, f) {
    this.tasks.push([index, f]);
};
StepControl.prototype.perform_all = function() {
    var $this = this;
    this.tasks.sort(function(a, b) { return a[0] - b[0]; });
    this.current_index = 0;
    while($this.current_index < $this.tasks.length) {
        $this.tasks[$this.current_index++][1]();
    }
};
StepControl.prototype.start = function() {
    this.tasks.sort(function(a, b) { return a[0] - b[0]; });
    this.current_index = 0;
    var $this = this;
    var step_size = Math.ceil(this.tasks.length / 1000);
    var proceed = function() {
        if($this.current_index < $this.tasks.length) {
            for(var i = 0; i < step_size; i++)
                if($this.current_index < $this.tasks.length)
                    $this.tasks[$this.current_index++][1]();
            $this.tm = setTimeout(proceed, 2);
        }
    };
    $this.tm = setTimeout(proceed, 2);
};
StepControl.prototype.cancel = function() {
    if(this.tm) clearTimeout(this.tm);
    this.tm = null;
};

var prev_sc = null;
var enable_animation = false;
// Draw main tree.
var draw_graph = function() {
    var ctx = canvas_graph.getContext('2d');
    var ctx_nodes = canvas_graph_nodes.getContext('2d');
    var width = view_width;
    var height = view_height;
    ctx.clearRect(0, 0, width, height);
    ctx_nodes.clearRect(0, 0, width, height);

    pixel_select_buffer = [];

    if(WeiboEvents.get("layout") == "curves") {
        weibo_curves.render(canvas_graph);
        return;
    }


    var ymap = current_map.ymap;
    var tmap = current_map.tmap;
    var t2coordinate = current_map.t2c;
    var get_w = current_map.get_w;
    // Begin drawing.
    var in_range = function(node) {
        return true;
        return node.y >= current_map.y0 && node.y <= current_map.y1 && t2coordinate(node.t) >= current_map.t0 && t2coordinate(node.t) <= current_map.t1;
    };

    if(prev_sc) prev_sc.cancel();
    var SC = new StepControl();
    prev_sc = SC;

    if(WeiboEvents.get("layout") == "circular") {
        var index = 0;
        for(var i in data_tree.nodes) { (function(i) {
            SC.addTask(data_tree.nodes[i].t, function() {
                var cnode = data_tree.nodes[i];
                var node = data_tree.nodes[cnode.parent];
                if(!node) return;
                if(true || in_range(node) || in_range(cnode)) {
                    var x1 = tmap(node.x), y1 = ymap(node.y);
                    var x2 = tmap(cnode.x), y2 = ymap(cnode.y);
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    var cx = x1; cy = y2;
                    if(WeiboEvents.get("layout") == "sail-span")
                        ctx.quadraticCurveTo(cx, cy, x2, y2);
                    else
                        ctx.lineTo(x2, y2);
                    al = 0.5;
                    if(node_filter(cnode))
                        ctx.strokeStyle = Colors.link.normal.toRGBA(al);
                    else
                        ctx.strokeStyle = Colors.link.fade.toRGBA(al * 0.5);

                    if(cnode.circular_expand) {
                        var grad = ctx.createLinearGradient(x1, y1, x2, y2);
                        if(node_filter(cnode)) {
                            grad.addColorStop(0, Colors.node.normal.toRGBA(1));
                            grad.addColorStop(1, Colors.node.normal.toRGBA(0));
                        } else {
                            grad.addColorStop(0, Colors.node.fade.toRGBA(1));
                            grad.addColorStop(1, Colors.node.fade.toRGBA(0));
                        }
                        ctx.strokeStyle = grad;
                    }
                    ctx.stroke();
                }
            });
        })(i); }
    } else {
        for(var i in data_tree.nodes) {
            var node = data_tree.nodes[i];

            var spanY = 0, deltaY = 1e100;
            if(node.children.length >= 2) {
                var cnode1 = data_tree.nodes[node.children[0]];
                var cnode2 = data_tree.nodes[node.children[node.children.length - 1]];
                var y1 = ymap(cnode1.y);
                var y2 = ymap(cnode2.y);
                spanY = Math.abs(y2 - y1);
                deltaY = spanY / (node.children.length - 1);
            }
            if(true) {
                if(deltaY < 2 && WeiboEvents.get("layout") != "circular") {
                    // Fill mode.
                    var fill_alpha = Math.sqrt(node.children.length / 1000);
                    if(fill_alpha > 0.6) fill_alpha = 0.6;
                    if(fill_alpha < 0.01) fill_alpha = 0.01;
                    ctx.fillStyle = Colors.spanArea.fill.toRGBA(fill_alpha);
                    ctx.strokeStyle = Colors.spanArea.stroke.toRGBA(fill_alpha * 0.5);
                    ctx.beginPath();
                    var xn = tmap(node.x), yn = ymap(node.y);
                    ctx.moveTo(xn, yn);
                    for(var j in node.children) {
                        var cnode = data_tree.nodes[node.children[j]];
                        var x2 = tmap(cnode.x), y2 = ymap(cnode.y);
                        if(j == 0 && WeiboEvents.get("layout") == "sail-span")
                            ctx.quadraticCurveTo(xn, y2, x2, y2);
                        else
                            ctx.lineTo(x2, y2);
                    }
                    ctx.lineTo(xn, yn);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    // Stroke mode.
                    for(var j in node.children) {
                        var cnode = data_tree.nodes[node.children[j]];
                        if(true || in_range(node) || in_range(cnode)) {
                            var x1 = tmap(node.x), y1 = ymap(node.y);
                            var x2 = tmap(cnode.x), y2 = ymap(cnode.y);
                            ctx.beginPath();
                            ctx.moveTo(x1, y1);
                            var cx = x1; cy = y2;
                            if(WeiboEvents.get("layout") == "sail-span")
                                ctx.quadraticCurveTo(cx, cy, x2, y2);
                            else
                                ctx.lineTo(x2, y2);
                            al = 0.5;
                            if(node_filter(cnode))
                                ctx.strokeStyle = Colors.link.normal.toRGBA(al);
                            else
                                ctx.strokeStyle = Colors.link.fade.toRGBA(al * 0.5);

                            if(cnode.circular_expand) {
                                var grad = ctx.createLinearGradient(x1, y1, x2, y2);
                                if(node_filter(cnode)) {
                                    grad.addColorStop(0, Colors.node.normal.toRGBA(1));
                                    grad.addColorStop(1, Colors.node.normal.toRGBA(0));
                                } else {
                                    grad.addColorStop(0, Colors.node.fade.toRGBA(1));
                                    grad.addColorStop(1, Colors.node.fade.toRGBA(0));
                                }
                                ctx.strokeStyle = grad;
                            }
                            ctx.stroke();
                        }
                    }
                }
            }
        }
    }
    var index = 0;
    for(var i in data_tree.nodes) { (function(i) {
        SC.addTask(data_tree.nodes[i].t, function() {
            var node = data_tree.nodes[i];
            var color = Colors.node.normal;
            var custom_color = node_color(node);
            node.shown = true;
            if(!node_filter(node)) {
                node.shown = false;
                ctx_nodes.fillStyle = Colors.node.fade.toRGBA(0.1);
            } else {
                if(custom_color)
                    ctx_nodes.fillStyle = custom_color.toRGBA(1);
                else
                    ctx_nodes.fillStyle = color.toRGBA(1);
            }
            if(in_range(node)) {
                var x = tmap(node.x);
                var y = ymap(node.y);
                ctx_nodes.beginPath();
                var w = get_w(node);
                ctx_nodes.arc(x, y, w, 0, Math.PI * 2);
                ctx_nodes.fill();
                // fill pixel_select_buffer
                if(node.shown)
                    pixel_select_buffer_addnode(node);
            }
        });
    })(i); }
    if(WeiboEvents.get("layout") == "sail-span") {
        var data = data_tree;
        var t_firstday = new Date(data.start*1000); t_firstday.setHours(12); t_firstday.setMinutes(0); t_firstday.setSeconds(0);
        var tFirstNoon = t_firstday.getTime() / 1000 - 3600 * 24;
        ctx.strokeStyle = Colors.marker.toRGBA();
        ctx.fillStyle = Colors.marker.toRGBA();
        var dts = [
            [ 1, 10 ],
            [ 5, 6 ],
            [ 10, 6 ],
            [ 20, 3 ],
            [ 60, 6 ],
            [ 360, 4 ],
            [ 720, 14 ], // day
            [ 1440, 7 ], // week
            [ 1440 * 7, 4 ]
        ];
        for(var i in dts) {
            var dt = dts[i][0] * 60;
            if((data.end - data.start) / dt < 500) {
                dt = dts[i][0] * 60;
                skip = dts[i][1];
                break;
            }
        }
        var cc = 0;
        tt = tFirstNoon;
        var lastpx = -1e10;
        while(tt < data.end) {
            if(tt >= data.start) {
                var h = (cc % skip == 0 ? 7 : 4);
                ctx.beginPath();
                var px = tmap(tt);
                if(cc % skip == 0) {
                    if(px - lastpx > 200) {
                        ctx.textAlign = "center";
                        ctx.fillText($("#timeline")[0].format_date(new Date(tt*1000)), px, height - 4);
                        lastpx = px;
                        h = 10;
                    }
                }
                ctx.moveTo(px, height - 24);
                ctx.lineTo(px, height - 24 + h);
                ctx.stroke();
            }
            tt += dt;
            cc++;
        }
    }
    if(enable_animation)
        SC.start();
    else
        SC.perform_all();
    if(draw_highlight_layer) draw_highlight_layer();
};

var get_parent_list = function(n) {
    var list = [];
    while(n) {
        list.push(n);
        if(!n.parent) break;
        n = data_tree.nodes[n.parent];
    }
    return list;
};

var get_bundled_path = function(n1, n2) {
    var pl1 = get_parent_list(n1);
    var pl2 = get_parent_list(n2);
    var i = pl1.length - 1, j = pl2.length - 1;
    while(pl1[i] == pl2[j] && i >= 0 && j >= 0) {
        i--; j--;
    }
    var path = [];
    for(var k = 0; k <= i; k++) {
        path.push(pl1[k]);
    }
    for(var k = j + 1; k >= 0; k--) {
        path.push(pl2[k]);
    }
    var ymap = current_map.ymap;
    var tmap = current_map.tmap;
    path = path.map(function(n) {
        return [ tmap(n.x), ymap(n.y) ];
    });
    return path;
};

var stroke_bundled_path = function(ctx, path) {
    var ref = function(path) {
        var r = [];
        r.push(path[0]);
        for(var i = 0; i < path.length - 1; i++) {
            r.push([ (path[i][0] + path[i + 1][0]) / 2,
                     (path[i][1] + path[i + 1][1]) / 2 ]);
        }
        r.push(path[path.length - 1]);
        return r;
    };
    if(path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for(var i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0], path[i][1]);
    }
    ctx.stroke();
};

var draw_network = function() {
    if(typeof(G_network) == "undefined" || !G_network) return;
    var ctx = canvas_graph_over.getContext('2d');

    var ymap = current_map.ymap;
    var tmap = current_map.tmap;

    var user_map = { };
    for(var i in data_tree.nodes) {
        var node = data_tree.nodes[i];
        if(!user_map[node.uid]) user_map[node.uid] = [];
        user_map[node.uid].push(node.mid);
    }
    G_network_reverse = { };
    for(var i in G_network) {
        for(var j in G_network[i]) {
            var k = G_network[i][j];
            if(!G_network_reverse[k]) G_network_reverse[k] = [];
            G_network_reverse[k].push(i);
        }
    }

    for(var idx in highlight_nodes) {
        var i = highlight_nodes[idx];
        var node = data_tree.nodes[i];
        var friends = G_network_reverse[node.uid];
        if(!friends) continue;
        for(var j = 0; j < friends.length; j++) {
            var fn = user_map[friends[j]];
            if(!fn) continue;
            for(var k = 0; k < fn.length; k++) {
                var tn = data_tree.nodes[fn[k]];
                ctx.strokeStyle = "rgba(255,127,14,0.2)";
                ctx.moveTo(tmap(node.x), ymap(node.y));
                ctx.lineTo(tmap(tn.x), ymap(tn.y));
                ctx.stroke();
            }
        }
    }
};

var collect_selected_tree = function() {
    // Collect nodes.
    var nodes = {};
    for(var i in highlight_nodes) {
        var node = data_tree.nodes[highlight_nodes[i]];
        if(nodes[node.id] == undefined) {
            nodes[node.id] = {
                id: node.id,
                parent: node.parent,
                children: [],
                t: node.t,
                expand: true
            };
        } else nodes[node.id].expand = true;

        while(node != undefined) {
            if(nodes[node.id] == undefined) {
                nodes[node.id] = {
                    id: node.id,
                    parent: node.parent,
                    children: [],
                    t: node.t,
                    expand: false
                };
            }
            node = data_tree.nodes[node.parent];
        }
    }
    for(var i in nodes) {
        var obj = nodes[i];
        if(nodes[obj.parent] != undefined) {
            nodes[obj.parent].children.push(obj.id);
        }
    }
    var assigned = true;
    while(assigned) {
        assigned = false;
        for(var i in nodes) {
            var obj = nodes[i];
            if(obj.level == undefined) {
                if(obj.parent == undefined) {
                    obj.level = 0;
                    assigned = true;
                } else {
                    if(nodes[obj.parent].level != undefined) {
                        assigned = true;
                        obj.level = nodes[obj.parent].level + 1;
                    }
                }
            }
        }
    }
    var number = 0;
    var preorder_t = function(root) {
        nodes[root].number = number++;
        var ch = nodes[root].children.sort(function(a, b) {
            return nodes[a].t - nodes[b].t;
        });
        for(var i in ch) {
            preorder_t(ch[i]);
        }
    };
    for(var i in nodes) {
        if(nodes[i].level == 0) preorder_t(i);
    }
    var node_sort = [];
    for(var i in nodes) {
        var n = nodes[i];
        node_sort.push(n.id);
    }
    node_sort.sort(function(a, b) {
        return nodes[a].number - nodes[b].number;
    });
    return {
        nodes: nodes,
        node_sort: node_sort
    };
}

var previous_ranges = [];

var cg_dragging = undefined;
var highlight_nodes = [];
var highlight_nodes_first;
highlight_nodes_expandall = false;
var highlight_logs = [];
var on_highlight_nodes_changed = function() {
};

var hover_node = undefined;
var highlight_user = undefined;
var timeline_mouse_t = undefined;

var highlighten_nodes = undefined;

set_highlight_user = function(uid) {
    highlight_user = uid;
    highlight_nodes_first = undefined;
    draw_canvas_graph_over();
    log_user_action("highlight-user", { uid: uid });
}
set_hover_node = function(id,no_highlight_user_close) {
    hover_node = id;
    if(!no_highlight_user_close)
        highlight_user = undefined;
    draw_canvas_graph_over();
}

var draw_canvas_graph_over = function() {
    var ctx = canvas_graph_over.getContext('2d');
    var ctx_lines = canvas_graph_over_lines.getContext('2d');
    var width = canvas_graph_over.width;
    var height = canvas_graph_over.height;
    ctx.clearRect(0, 0, width, height);

    ctx.font = "12px Helvetica";
    ctx_lines.clearRect(0, 0, width, height);
    var tmap = current_map.tmap;
    var itmap = current_map.itmap;
    var ymap = current_map.ymap;

    var link_stroke = function(node, cnode, stroke_color) {
        var x1 = tmap(node.x), y1 = ymap(node.y);
        var x2 = tmap(cnode.x), y2 = ymap(cnode.y);
        ctx_lines.beginPath();
        ctx_lines.moveTo(x1, y1);
        var cx = x1; cy = y2;
        if(WeiboEvents.get("layout") == "sail-span" || WeiboEvents.get("layout") == "curves")
            ctx_lines.quadraticCurveTo(cx, cy, x2, y2);
        else
            ctx_lines.lineTo(x2, y2);
        if(stroke_color) ctx_lines.strokeStyle = stroke_color.toRGBA();
        else ctx_lines.strokeStyle = Colors.traceColor.toRGBA();
        ctx_lines.stroke();
    }

    for(var index in highlight_nodes) {
        var highlight_node = highlight_nodes[index];
        var node = data_tree.nodes[highlight_node];

        var tnode = node;
        while(node != undefined) {
            var parent = data_tree.nodes[node.parent];
            if(parent != undefined)
                link_stroke(data_tree.nodes[node.parent], node);
            node = data_tree.nodes[node.parent];
        }
        node = tnode;
        ctx.strokeStyle = Colors.highlightColor.toRGBA();
        ctx.fillStyle = Colors.highlightColor.toRGBA();
        var is_this = true;
        while(node != undefined) {
            var x = tmap(node.x);
            var y = ymap(node.y);
            var w = current_map.get_w(node);
            ctx.beginPath();
            ctx.arc(x, y, w, 0, Math.PI * 2);
            if(!is_this) ctx.fill();
            var parent = data_tree.nodes[node.parent];
            node = data_tree.nodes[node.parent];
            ctx.fillStyle = Colors.traceColor.toRGBA();
            is_this = false;
        }
    }
    for(var index in highlight_nodes) {
        var highlight_node = highlight_nodes[index];
        var node = data_tree.nodes[highlight_node];
        var xn = tmap(node.x), yn = ymap(node.y);

        ctx.textAlign = "center";
        var w = current_map.get_w(node);
        ctx.strokeStyle = Colors.background.toRGBA();
        ctx.lineWidth = 2;
        ctx.strokeText(node.username, xn, yn - w - 8);
        ctx.lineWidth = 1;
        ctx.font = "12px Helvetica";
        ctx.fillStyle = Colors.foreground.toRGBA();
        ctx.fillText(node.username, xn, yn - w - 8);

        if(node.id == highlight_nodes_first) {
            // stroke circle for same author.
            ctx.strokeStyle = Colors.highlightSameAuthor.toRGBA();
            for(var ai in authors[node.uid]) {
                var cnode = data_tree.nodes[authors[node.uid][ai]];
                if(!node_filter(cnode)) continue;
                if(cnode != node) {
                    var x = tmap(cnode.x);
                    var y = ymap(cnode.y);
                    var w = current_map.get_w(cnode);
                    ctx.beginPath();
                    ctx.arc(x, y, w + 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }

        ctx.strokeStyle = ctx.fillStyle = Colors.highlightColor.toRGBA();
        var x = tmap(node.x);
        var y = ymap(node.y);
        var w = current_map.get_w(node);

        ctx.beginPath();
        ctx.arc(x, y, w, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = ctx.fillStyle = Colors.highlightColor.toRGBA();

        if(highlight_nodes_expandall || node.id == highlight_nodes_first) {
            var x = tmap(node.x), y = ymap(node.y);
            x += 150;
            y -= 15;
            if(node.box_offset_x === undefined) {
                if(x > view_width / 3 * 2) node.box_offset_x = -210 - 150 - 150;
                else node.box_offset_x = 0;
            }
            if(node.box_offset_y === undefined) node.box_offset_y = 0;
            x += node.box_offset_x;
            y += node.box_offset_y;
            var w = 210;
            var h = 24;
            var nx = tmap(node.x);
            var ny = ymap(node.y);
            if(nx < x || nx > x + w || ny < y || ny > y + h) {
                var mt = 1;
                if(nx < x) {
                    y = y + 15;
                } else if(nx > x + w) {
                    x = x + w;
                    y = y + 15;
                } else if(ny < y) {
                    x = x + w / 2;
                    mt = 2;
                } else {
                    x = x + w / 2;
                    y = y + h / 2;
                    mt = 2;
                }

                ctx.beginPath();
                ctx.moveTo(x, y);
                if(mt == 1) {
                    ctx.quadraticCurveTo(nx, y, nx, ny);
                } else {
                    ctx.quadraticCurveTo(x, ny, nx, ny);
                }
                ctx.strokeStyle = Colors.highlightBox.border.toRGBA();
                ctx.stroke();
            }
        }
    }
    if(highlight_user != undefined) {
        // stroke circle for highlight_user.
        for(var ai in authors[highlight_user]) {
            var cnode = data_tree.nodes[authors[highlight_user][ai]];
            if(!node_filter(cnode)) continue;
            ctx.strokeStyle = Colors.highlightColor.toRGBA();
            var x = tmap(cnode.x);
            var y = ymap(cnode.y);
            var w = current_map.get_w(cnode);
            ctx.beginPath();
            ctx.arc(x, y, w + 1, 0, Math.PI * 2);
            var t = (w + 1) + 2;
            var tt = t * 2;
            ctx.moveTo(x + t, y); ctx.lineTo(x + tt, y);
            ctx.moveTo(x - t, y); ctx.lineTo(x - tt, y);
            ctx.moveTo(x, y + t); ctx.lineTo(x, y + tt);
            ctx.moveTo(x, y - t); ctx.lineTo(x, y - tt);
            ctx.stroke();
        }
    }
    if(hover_node != undefined && highlight_nodes_first != hover_node) {
        var node = data_tree.nodes[hover_node];
        var xn = current_map.tmap(node.x);
        var yn = current_map.ymap(node.y);
        ctx.textAlign = "left";
        var w = current_map.get_w(node);

        var txt = node.text;
        if(false) { // hover or not...
            if(txt.length > 20)
                txt = txt.substr(0, 17) + "...";
            txt = [txt];
        } else {
            txt = txt + "\n直接转发: " + node.children.length + " 评论: " + node.comments_count + " 粉丝: " + node.followers_count;
            txt = measureTextBlock(ctx, txt, 200);
            if(txt.length == 0) txt = [""];
        }
        var text_width = ctx.measureText(node.username).width;
        for(var i = 0; i < txt.length; i++) {
            var wd = ctx.measureText(txt[i]).width;
            if(wd > text_width) text_width = wd;
        }
        ctx.beginPath();
        ctx.arc(xn, yn, w + 3, 0, Math.PI * 2);
        ctx.strokeStyle = Colors.hoverBox.border.toRGBA();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xn + w + 3, yn);
        ctx.lineTo(xn + w + text_width + 20, yn);
        ctx.lineTo(xn + w + text_width + 20, yn + 18 + 14 * txt.length);
        ctx.lineTo(xn + w + 10, yn + 18 + 14 * txt.length);
        ctx.lineTo(xn + w + 10, yn + 20);
        ctx.quadraticCurveTo(xn + w + 10, yn, xn + w + 3, yn);
        ctx.fillStyle = Colors.hoverBox.fill.toRGBA();
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 12px Helvetica";
        ctx.fillStyle = Colors.hoverBox.text.toRGBA(); ctx.fillText(node.username, xn + w + 15, yn + 12);
        ctx.font = "12px Helvetica";
        for(var i = 0; i < txt.length; i++) {
            ctx.fillStyle = Colors.hoverBox.text.toRGBA(); ctx.fillText(txt[i], xn + w + 15, yn + 26 + 14 * i);
        }
        var tnode = node;
        while(node != undefined) {
            var parent = data_tree.nodes[node.parent];
            if(parent != undefined) {
                parent._current_hover_children = node.id;
                link_stroke(data_tree.nodes[node.parent], node, Colors.hoverBox.border);
                var xp = current_map.tmap(parent.x);
                var yp = current_map.ymap(parent.y);
                var wp = current_map.get_w(parent);
                ctx.strokeStyle = Colors.hoverBox.border.toRGBA(1);
                ctx.beginPath();
                ctx.arc(xp, yp, wp + 2, 0, Math.PI * 2);
                ctx.stroke();
            }
            node = data_tree.nodes[node.parent];
        }
    }

    if(cg_dragging != undefined) {
        if(cg_dragging.action == "zoom" && cg_dragging.x1 != undefined) {
            ctx.strokeStyle = Colors.selectBox.border.toRGBA();
            ctx.fillStyle = Colors.selectBox.fill.toRGBA();
            ctx.strokeRect(cg_dragging.x0 - 0.5, cg_dragging.y0 - 0.5, cg_dragging.x1 - cg_dragging.x0, cg_dragging.y1 - cg_dragging.y0);
            ctx.fillRect(cg_dragging.x0 - 0.5, cg_dragging.y0 - 0.5, cg_dragging.x1 - cg_dragging.x0, cg_dragging.y1 - cg_dragging.y0);
        }
        if(cg_dragging.action == "move-node" && cg_dragging.x1) {

            ctx.fillStyle = Colors.dragging.toRGBA();
            ctx.strokeStyle = Colors.dragging.toRGBA();
            var node = data_tree.nodes[cg_dragging.dragging_node];
            var x = cg_dragging.x1;
            var y = cg_dragging.y1;
            var w = current_map.get_w(node);
            var r = Math.abs(current_map.tmap(node.circular_radius) - current_map.tmap(0)) * layout_circular_scale;
            ctx.beginPath();
            ctx.arc(x, y, w, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    if(timeline_mouse_t != undefined && WeiboEvents.get("layout") == "sail-span") {
        var x = tmap(timeline_mouse_t);
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }


    var node_width = 210;

    var measureTextBlock2 = function(text, max_w) {
        var w = 0;
        var lines = [];
        var iprev = 0;
        for(var i = 0; i < text.length; i++) {
            var wc = ctx.measureText(text[i]).width;
            if(text[i] == "\n") {
                w = 0;
                lines.push(text.substr(iprev, i - iprev));
                iprev = i + 1;
            }
            if(w + wc > max_w) {
                w = 0;
                lines.push(text.substr(iprev, i - iprev));
                iprev = i;
            }
            w += wc;
        }
        if(iprev < text.length) {
            lines.push(text.substr(iprev));
        }
        return lines;
    }
    var draw_node = function(_node, x, y) {
        var node = _node;
        ctx.font = "12px Helvetica";
        var h;


        var lines = measureTextBlock2(
                    node.text + "\n" +
                    "直接转发: " + node.children.length + " 评论: " + node.comments_count + " 粉丝: " + node.followers_count
                    , node_width - 10);
        var h = lines.length * 14 + 24 + 5 + 8;

        // Timeline in highlighted nodes.
        if((!node.distribution_view_canvas || node.distribution_view_canvas._colorscheme != WeiboEvents.get("colorscheme")) && node.children.length > 0) {
            var node_canvas = document.createElement('canvas');
            var node_canvas_ctx = node_canvas.getContext('2d');
            node_canvas.width = 200 * view_scaling;
            node_canvas.height = 20 * view_scaling;
            node_canvas._width = 200;
            node_canvas._height = 20;
            node_canvas._colorscheme = WeiboEvents.get("colorscheme");

            node_canvas_ctx.setTransform(view_scaling, 0, 0, view_scaling, 0, 0);

            var nodes_all_children = [];
            var nodes_all_collect = function(node) {
                nodes_all_children.push(node.t);
                for(var ci in node.children) {
                    nodes_all_collect(data_tree.nodes[node.children[ci]]);
                }
            }
            nodes_all_collect(node);
            var pms1 = pkuvis_distribution_view(nodes_all_children, {
                canvas: node_canvas, context: node_canvas_ctx,
                y_range: [0, 19],
                width: 200,
                stroke_style: Colors.foreground.ofAlpha(0.6).toRGBA(),
                fill_style: Colors.foreground.ofAlpha(0.05).toRGBA(),
                return_params: true
            });
            pkuvis_distribution_view(node.children.map(function(x) { return data_tree.nodes[x].t; }), {
                canvas: node_canvas, context: node_canvas_ctx,
                y_range: [0, 19],
                width: 200,
                scale: pms1.scale,
                start: pms1.start, end: pms1.end,
                stroke_style: Colors.highlightBox.border.ofAlpha(0.9).toRGBA(),
                fill_style: Colors.highlightBox.fill.toRGBA()
            });
            node.distribution_view_canvas = node_canvas;
        }

        // If we have timeline, add to height.
        if(node.distribution_view_canvas) {
            h += node.distribution_view_canvas._height;
        }

        // Main rect
        ctx.strokeStyle = Colors.highlightBox.border.toRGBA();
        ctx.fillStyle = Colors.highlightBox.fill.toRGBA();
        ctx.fillRect(x, y, node_width, h);

        var y0 = y + 16;
        // Title rect
        ctx.fillStyle = Colors.highlightBox.title.toRGBA();
        ctx.fillRect(x, y, node_width, 24);
        // Name
        ctx.fillStyle = Colors.foreground.toRGBA();
        ctx.font = "bold 12px Helvetica";
        ctx.fillText(node.username, x + 8, y0);
        // Buttons.
        var draw_button = function(index, text) {
            ctx.save();
            ctx.font = "12px WeiboEventsIcons";
            ctx.fillStyle = Colors.highlightBox.fill.toRGBA();
            ctx.fillRect(x + node_width - index * 21 + 3 - 24, y + 3, 18, 18);
            ctx.textAlign = "center";
            ctx.fillStyle = Colors.foreground.toRGBA();
            ctx.fillText(text, x + node_width - index * 21 + 3 - 24 + 9, y + 3 + 13);
            ctx.restore();
        };
        draw_button(0, FONT_WeiboEventsIcons["tools-cross"]);
        draw_button(1, FONT_WeiboEventsIcons["tools-link"]);
        // Stroke the boundary now.
        ctx.strokeRect(x, y, node_width, h);

        ctx.font = "12px Helvetica";
        y0 += 24;
        // Content
        ctx.fillStyle = Colors.foreground.toRGBA();
        for(var i in lines) {
            ctx.fillText(lines[i], x + 5, y0);
            y0 += 14;
        }
        y0 += 6;

        // Draw timeline if available.
        if(node.distribution_view_canvas) {
            ctx.drawImage(node.distribution_view_canvas, Math.round(x) + 5, Math.round(y0) - 15, node.distribution_view_canvas._width, node.distribution_view_canvas._height);
        }

        return [x, y, node_width, h];
    };

    for(var i = highlight_nodes.length - 1; i >= 0; i--) {
        (function(id) {
            var node = data_tree.nodes[id];
            if(highlight_nodes_expandall || node.id == highlight_nodes_first) {
                ctx.textAlign = "left";
                var x = tmap(node.x), y = ymap(node.y);
                var tx = x + 150;
                var ty = y - 15;
                tx += node.box_offset_x ? node.box_offset_x : 0;
                ty += node.box_offset_y ? node.box_offset_y : 0;
                sz = draw_node(node, tx, ty);
                node.box_location = sz;
            }
        })(highlight_nodes[i]);
    }
    //if(draw_network) draw_network();
};

// Highlight overlay layer.
highlight_groups = { }; // group_name : { color: ids: }
var draw_highlight_layer = function() {
    var has_group = false;
    for(var i in highlight_groups) {
        has_group = true;
    }
    if(!has_group) {
        $(canvas_overlay).hide();
        var ctx = canvas_overlay.getContext('2d');
        ctx.clearRect(0, 0, canvas_overlay.width, canvas_overlay.height);
        highlighten_nodes = undefined;
    } else {
        $(canvas_overlay).show();
        highlighten_nodes = {};
        var node_groups = { };
        for(var g in highlight_groups) {
            var group = highlight_groups[g];
            for(var i in group.ids) {
                var id = group.ids[i];
                if(!node_groups[id]) {
                    node_groups[id] = [];
                    highlighten_nodes[id] = 1;
                }
                node_groups[id].push(g);
            }
        }
        var ctx = canvas_overlay.getContext('2d');
        ctx.clearRect(0, 0, canvas_overlay.width, canvas_overlay.height);
        for(var id in node_groups) {
            var grps = node_groups[id];
            var x = current_map.tmap(data_tree.nodes[id].x);
            var y = current_map.ymap(data_tree.nodes[id].y);
            var w = current_map.get_w(data_tree.nodes[id]);
            var n = grps.length;
            for(var j in grps) {
                ctx.fillStyle = highlight_groups[grps[j]].color;
                ctx.beginPath();
                var r1 = j / n * Math.PI * 2;
                var r2 = r1 + 1.0 / n * Math.PI * 2;
                ctx.moveTo(x, y);
                ctx.arc(x, y, w, r1, r2);
                ctx.fill();
            }
        }
    }
}

$("#timeline")[0].custom_draw = function(ctx, args) {
    var tree = collect_selected_tree();
    for(var i in tree.nodes) {
        if(tree.nodes[i].parent == undefined) continue;
        var n = data_tree.nodes[tree.nodes[i].id];
        var p = data_tree.nodes[tree.nodes[i].parent];
        var xp = args.tmap(p.t);
        var xn = args.tmap(n.t);
        var yp = tree.nodes[tree.nodes[i].parent].level * 4 + 15;
        var yn = tree.nodes[i].level * 4 + 15;
        ctx.strokeStyle = Colors.traceColor.interp(Colors.background, 0.5).toRGBA();
        ctx.beginPath();
        ctx.moveTo(xp, yp);
        ctx.quadraticCurveTo(xp, yn, xn, yn);
        ctx.stroke();
    }
    for(var i in tree.nodes) {
        var node = data_tree.nodes[tree.nodes[i].id];
        var x = args.tmap(node.t);
        if(!tree.nodes[i].expand) {
            ctx.fillStyle = Colors.traceColor.toRGBA();
            ctx.beginPath();
            ctx.arc(x, 15 + 4 * tree.nodes[i].level, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    for(var i in tree.nodes) {
        var node = data_tree.nodes[tree.nodes[i].id];
        var x = args.tmap(node.t);
        if(tree.nodes[i].expand) {
            ctx.fillStyle = Colors.highlightColor.toRGBA();
            ctx.beginPath();
            ctx.arc(x, 15 + 4 * tree.nodes[i].level, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    if(hover_node != undefined) {
        var node = data_tree.nodes[hover_node];
        var x = args.tmap(node.t);
        ctx.strokeStyle = Colors.node.normal.toRGBA();
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 100);
        ctx.stroke();
    }
};

var redraw_graphs = function() {
    draw_graph();
    draw_canvas_graph_over();
    draw_sketchpad_overlay();
};

var draw_sketchpad_overlay = function() {
    $("#graph-sketchpad")[0].redraw();
};

$("#graph-sketchpad")[0].custom_draw = function(ctx) {
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
};

set_canvas_size();
WeiboEvents.namedOn("resize", "si", function() {
    set_canvas_size();
    $("#graph-sketchpad").css("width", view_width + "px");
    $("#graph-sketchpad").css("height", view_height + "px");
    $("#graph-sketchpad")[0].update_size();
    redraw_graphs();
});


$("#graph-sketchpad").css("width", view_width + "px");
$("#graph-sketchpad").css("height", view_height + "px");
pkuvis_sketchpad_initialize($("#graph-sketchpad")[0]);
$("#graph-sketchpad")[0].on_sketchpad_close = function() {
    $("#btn-paint").removeClass('active');
    $("#graph-sketchpad .toolbox").hide();
}
$("#graph-sketchpad").show();
$("#graph-sketchpad .toolbox").hide();
