var weibo_curves = (function() {
// This code is imported from the previous coursework "WeiboCurves".
// Needs protection and integration into the new system.
// Here we enclose all the internal stuff and export an object 'weibo_curves' for other code to call it.

// The original initialization code is preserved.

// Parameters.
var draw_info = {
    type : "normal",
    height_func: "log",
    hf_pow : 0.5,
    scale: 20,
    alpha: 0.001,
    min_descendant : 20,
    threshold_split: 10,
    timeline_scale: 5,
    timeline_sigma: 100,
    emotion_pow: 1,
    vspace: 100
};

// Do we need to rebuild the timelines?
var need_rebuild_timeline = true;

var get_node_color = function() {
    return Colors.node.normal;
};

// Build timeline.
var build_timeline = function(times, sigma, weights) {
    if(!sigma) sigma = draw_info.timeline_sigma;
    if(!weights) {
        weights = times.map(function() { return 1; });
    }
    var eobj = {};
    var tmin = times[0];
    var tmax = times[times.length - 1];
    var start = tmin - sigma * 5;
    var end = tmax + sigma * 5;
    if(times.length > 100) {
        var tk = (times[Math.floor(times.length * 0.5)] - tmin) * 20 + tmin;
        if(tk < end) end = tk;
    }

    var parzen_window = function(tmin, tmax, count, atoms, kernel, kmin, kmax) {
        var r = [];
        for(var i = 0; i < count; i++) {
            r.push(0);
        }
        var get_t = function(i) {
            return i / (count - 1) * (tmax - tmin) + tmin;
        };
        var get_i = function(t) {
            return (t - tmin) / (tmax - tmin) * (count - 1);
        };
        for(var i in atoms) {
            var t = atoms[i];
            var t0 = t + kmin;
            var t1 = t + kmax;
            var j1 = Math.floor(get_i(t0));
            var j2 = Math.ceil(get_i(t1));
            if(j1 < 0) j1 = 0;
            if(j2 >= count) j2 = count - 1;
            for(var j = j1; j <= j2; j++) {
                r[j] += kernel(get_t(j) - t, i) * weights[i];
            }
        }
        return r;
    };
    var per = (end - start) / (data_tree.end - data_tree.start);

    var timeline = parzen_window(start, end, Math.round(4000 * per), times, function(x) {
        return Math.exp(-x*x/2/sigma/sigma)/Math.sqrt(2*Math.PI)/sigma;
    }, -sigma * 8, sigma * 8);

    eobj.tmin = tmin;
    eobj.tmax = tmax;
    eobj.start = start;
    eobj.end = end;
    eobj.timeline = timeline;
    return eobj;
};

// Stroke timeline path on the canvas.
var timeline_path = function(timeline_pos, timeline_neg, times, weights, ids, ctx, map, y0, color, t_start, ymap) {
    ctx.beginPath();
    ctx.moveTo(map(timeline_pos.start), y0);
    var scale = (timeline_pos.end - timeline_pos.start) / (timeline_pos.timeline.length - 1);
    var bias = timeline_pos.start;
    for(var i in timeline_pos.timeline) {
        var t = i * scale + bias;
        var x = map(t);
        var y = -1 * ymap(timeline_pos.timeline[i]) + y0;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(map(timeline_pos.end), y0);
    for(var i = timeline_pos.timeline.length - 1; i >= 0; i--) {
        var t = i * scale + bias;
        var x = map(t);
        var y = 1 * ymap(timeline_neg.timeline[i]) + y0;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(map(timeline_pos.start), y0);
    ctx.fillStyle = color.toRGBA(0.2);
    ctx.strokeStyle = color.toRGBA(0.8);
    ctx.fill();
    ctx.stroke();


    // ctx.beginPath();
    // ctx.moveTo(map(t_start), y0);
    // ctx.lineTo(map(timeline_pos.end), y0);
    // ctx.stroke();

    ctx.fillStyle = color.toRGBA(0.3);
    for(var i in times) {
        var t = times[i];
        var idx = Math.round((t - bias) / scale);
        var val = timeline_pos.timeline[idx] + timeline_neg.timeline[idx];
        var x = map(t);
        if(val != null && val != undefined && ymap(val) <= 2) {
            ctx.beginPath();
            ctx.arc(x, y0, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

// Draw Cloudlines, not used currently.
var cloud_lines = function(times, sigma, ys, ctx, y0, map, color, t0) {
    var timeline = build_timeline(times, sigma);
    var scale = (timeline.end - timeline.start) / (timeline.timeline.length - 1);
    var bias = timeline.start;
    ctx.beginPath();
    ctx.moveTo(map(t0), y0);
    ctx.lineTo(map(timeline.timeline.length * scale + bias), y0);
    ctx.strokeStyle = color.toRGBA(0.5);
    ctx.stroke();

    var ymap = function(y) {
        return (1.0 - Math.exp(-y * draw_info.timeline_scale)) * 25;
    };

    ctx.fillStyle = color.mix(new WeiboEvents.Color(255,255,255,1), 0.5).toRGBA(0.5);
    for(var i in timeline.timeline) {
        var t = i * scale + bias;
        var x = map(t);
        var r = ymap(timeline.timeline[i]);
        if(r > 2) {
            ctx.beginPath();
            ctx.arc(x, y0, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.fillStyle = color.toRGBA();
    for(var i in times) {
        var t = times[i];
        var idx = Math.round((t - bias) / scale);
        var val = timeline.timeline[idx];
        var x = map(t);
        if(val && ymap(val) <= 2) {
            ctx.beginPath();
            ctx.arc(x, y0, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

// For each non-expanded descendant.
var each_descendant = function(node, func) {
    for(var i in node.children) {
        var n = data_tree.nodes[node.children[i]];
        if(n.circular_expand) continue;
        func(n);
        each_descendant(n, func);
    }
};

// Collect children for expanded tweets.
var collect_expanded_children = function(node, result) {
    for(var i in node.children) {
        var n = data_tree.nodes[node.children[i]];
        if(n.circular_expand) result.push(node.children[i]);
        else collect_expanded_children(n, result);
    }
};

// Reverse traversal.
var each_descendant_reverse = function(node, func) {
    func(node);
    var tc = [];
    collect_expanded_children(node, tc);
    tc = tc.sort(function(b, a) { return data_tree.nodes[a].t - data_tree.nodes[b].t; });
    for(var i = 0; i < tc.length; i++) {
        var n = data_tree.nodes[tc[i]];
        each_descendant_reverse(n, func);
    }
};

// Computer level for a node.
var compute_level = function(node) {
    if(node._n_level) return node._n_level;
    if(node.parent) {
        var p = data_tree.nodes[node.parent];
        return node._n_level = compute_level(p) + 1;
    } else {
        return 0;
    }
};

// Computer the number of descendants.
var compute_descendants = function(node) {
    if(node._n_desc) return node._n_desc;
    var r = 1;
    for(var i in node.children) {
        var n = data_tree.nodes[node.children[i]];
        if(!n.circular_expand)
            r += compute_descendants(n);
    }
    return node._n_desc = r;
};

// Generate timelines, return the height.
var calculate_lines = function(node, ctx, get_x, y0, stage_val) {
    var max_pos = 0, max_neg = 0;
    // Collect and draw timelines.
    var draw_timeline = function(node) {
        var timeline_nodes = [];
        for(var i in node.children) {
            var cnode = data_tree.nodes[node.children[i]];
            if(cnode.circular_expand) continue;
            if(compute_descendants(cnode) > draw_info.min_descendant) {
                // draw timeline.
                draw_timeline(cnode);
            } else {
                // collect this child node into timeline.
                timeline_nodes.push(cnode);
                each_descendant(cnode, function(n) {
                    timeline_nodes.push(n);
                });
            }
        }
        var spow = function(t, k) {
            if(t > 0) return Math.pow(t, k);
            else return -Math.pow(-t, k);
        };
        var emotion_transform = function(x) {
            if(x === null || x === undefined) return 0.5;
            x = x / 2;
            if(x > 1) x = 1; if(x < -1) x = -1;
            x = (x + 1) / 2;
            return x; //(spow(2 * x - 1, draw_info.emotion_pow) + 1) / 2;
        };
        var times = timeline_nodes.map(function(n) { return [n.t, emotion_transform(n.emotion)]; });
        if(times.length > 0) {
            times.sort(function(a, b) { return a[0] - b[0]; });
            var times_t = times.map(function(a) { return a[0]; });
            var times_w = times.map(function(a) { return a[1]; });
            var color = get_node_color(node);
            var timeline_pos = build_timeline(times_t, null, times_w);
            var timeline_neg = build_timeline(times_t, null, times_w.map(function(x) { return 1 - x; }));
            node.timeline = {
                neg: timeline_neg,
                pos: timeline_pos
            };
            for(var i in node.timeline.pos.timeline) {
                if(node.timeline.pos.timeline[i] > max_pos) max_pos = node.timeline.pos.timeline[i];
            }
            for(var i in node.timeline.neg.timeline) {
                if(node.timeline.neg.timeline[i] > max_neg) max_neg = node.timeline.neg.timeline[i];
            }
        }
    };

    draw_timeline(node);
    return [ max_pos, max_neg ];
};

// Stroke timelines.
var stroke_lines = function(node, ctx, get_x, y0, ymap, stage_val) {
    var stroke_node = function(node, ff) {
        var x = get_x(node.t);
        var y = y0;
        var r = current_map.get_w(node);
        ctx.fillStyle = get_node_color(node).toRGBA();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "12px Arial";
        ctx.textAlign = "right";
        if(ff) {
            ctx.strokeStyle = Colors.background.toRGBA();
            ctx.strokeText(node.username, x - 20, y + 4);
            ctx.fillStyle = Colors.foreground.toRGBA();
            ctx.fillText(node.username, x - 20, y + 4);
        }
    };

    // Collect and draw timelines.
    var draw_timeline = function(node) {
        var timeline_nodes = [];
        for(var i in node.children) {
            var cnode = data_tree.nodes[node.children[i]];
            if(cnode.circular_expand) continue;
            if(compute_descendants(cnode) > draw_info.min_descendant) {
                // draw timeline.
                draw_timeline(cnode);
            } else {
                // collect this child node into timeline.
                timeline_nodes.push(cnode);
                each_descendant(cnode, function(n) {
                    timeline_nodes.push(n);
                });
            }
        }
        var times = timeline_nodes.map(function(n) {
            return [n.t, n.positive_emotion];
        });
        var ids = timeline_nodes.map(function(n) { return n.mid; });
        if(times.length > 0) {
            times.sort(function(a, b) { return a[0] - b[0]; });
            var times_t = times.map(function(a) { return a[0]; });
            var times_w = times.map(function(a) { return a[1]; });
            var color = get_node_color(node);
            var timeline_pos = node.timeline.pos;
            var timeline_neg = node.timeline.neg;
            timeline_path(timeline_pos, timeline_neg, times_t, times_w, ids, ctx, get_x, y0, color, node.t, ymap);

            /*
            ctx.strokeStyle = "rgba(" + color + ",1)";
            ctx.fillStyle = "rgba(" + color + ",0.1)";
            var tl = build_timeline(times);
            ctx.beginPath();
            timeline_path(tl, ctx, get_x, y0);
            ctx.fill();
            ctx.stroke();
            */

            //cloud_lines(times, null, 200, ctx, y0, get_x, color, node.t);
        }
    };

    // Draw keywords for a node.
    var draw_keywords = function(node) {
        return;
        // collect keywords.
        var word_count = { };
        var f = function(n) {
            if(n.words) {
                var kws = n.words.split(",");
                for(var i in kws) {
                    var w = kws[i];
                    if(w != "") {
                        if(!word_count[w]) word_count[w] = 1;
                        else word_count[w]++;
                    }
                }
            }
        };
        f(node);
        each_descendant(node, f);
        var words = [];
        for(var w in word_count) words.push([w, word_count[w]]);
        words.sort(function(a, b) { return b[1] - a[1]; });
        words = words.slice(0, 10);
        words = words.map(function(x) { return x[0]; }).join(" / ");
        ctx.textAlign = "left";
        ctx.fillStyle = Colors.foreground.toRGBA(0.5);
        ctx.strokeStyle = Colors.background.toRGBA(0.5);
        ctx.font = "12px Arial";
        ctx.lineWidth = 2;
        ctx.strokeText(words, get_x(node.t) + 10, current_map.ymap(node.y) - 6);
        ctx.lineWidth = 1;
        ctx.fillText(words, get_x(node.t) + 10, current_map.ymap(node.y) - 6);
    };

    // if stage = true, then draw timeline and keywords.
    if(stage_val) {
        draw_timeline(node);
        draw_keywords(node);
        return;
    }
    // otherwise draw key nodes.

    // Draw lines.
    each_descendant(node, function(n) {
        if(!n.parent) return;
        var p = data_tree.nodes[n.parent];
        var x0 = get_x(p.t);
        var x1 = get_x(n.t);
        var desc_n = compute_descendants(n);
        if(desc_n <= draw_info.min_descendant) return;

        ctx.beginPath();
        var al = draw_info.alpha;
        var alpha = 1 - Math.pow(1 - al, desc_n);
        ctx.strokeStyle = Colors.foreground.toRGBA(alpha.toFixed(4));
        var dx = Math.abs(x1 - x0);
        // control height function.
        var height;
        if(draw_info.height_func == 'log') {
            height = draw_info.scale * Math.atan(dx / 5);
        } else if(draw_info.height_func == 'pow') {
            height = draw_info.scale * Math.atan(dx / 5);
        }

        height *= compute_level(n) % 2 == 0 ? -1 : 1;

        if(draw_info.type == "rect") {
            ctx.moveTo(x0, y0);
            var px = (x1 - x0) / 2;
            if(px > Math.abs(height)) px = Math.abs(height);
            var c1 = x0 + px;
            var c2 = x1 - px;
            ctx.bezierCurveTo(x0, y0 + height, x0, y0 + height, c1, y0 + height);
            ctx.lineTo(c2, y0 + height);
            ctx.bezierCurveTo(x1, y0 + height, x1, y0 + height, x1, y0);
        } else if(draw_info.type == "circle") {
            // Alpha encoded circles.
            var ang1 = 0;
            var ang2 = 0;
            if(compute_level(n) % 2 == 1) { ang1 = -Math.PI; ang2 = 0; }
            if(compute_level(n) % 2 == 0) { ang1 = 0; ang2 = Math.PI; }
            ctx.arc((x0 + x1) / 2, y0, Math.abs((x1 - x0) / 2), ang1, ang2);
        } else {
            ctx.moveTo(x0, y0);
            ctx.quadraticCurveTo((x0 + x1) / 2, y0 + height, x1, y0);
        }


        /*
        var minw = 30;
        if(dx < minw) {
            var delta = Math.min(minw, x1 - x0) / minw * height;
            ctx.bezierCurveTo(x0, y0 + delta, x0, y0 + delta, x0 + dx / 2, y0 + delta);
            ctx.lineTo(x1 - dx / 2, y0 + delta);
            ctx.bezierCurveTo(x1, y0 + delta, x1, y0 + delta, x1, y0);
        } else {
            var delta = height;
            ctx.bezierCurveTo(x0, y0 + delta, x0, y0 + delta, x0 + minw / 2, y0 + delta);
            ctx.lineTo(x1 - minw / 2, y0 + delta);
            ctx.bezierCurveTo(x1, y0 + delta, x1, y0 + delta, x1, y0);
        }
        */
        ctx.stroke();
        if(compute_descendants(n) > draw_info.min_descendant) {
            stroke_node(n);
        }
    });
    stroke_node(node, true);
};

var perform_this_layout = function() {
    // first collect key nodes.
    for(var i in data_tree.nodes) {
        data_tree.nodes[i].circular_expand = false;
        if(need_rebuild_timeline) {
            delete data_tree.nodes[i].timeline;
            delete data_tree.nodes[i].space;
        }
    }
    for(var i in data_tree.nodes) {
        data_tree.nodes[i].circular_expand = true;
        break;
    }
    for(var i in data_tree.nodes) {
        if(data_tree.nodes[i].children.length > draw_info.threshold_split)
            data_tree.nodes[i].circular_expand = true;
    }

    draw_info.timeline_sigma = (data_tree.end - data_tree.start) / 200;

    // adjust canvas size.
    var W = view_width;
    var H = view_height;

    var vspace = 400;

    var ymap = function(y) {
        //return y * draw_info.timeline_scale * draw_info.vspace;
        return (1.0 - Math.exp(-y * draw_info.timeline_scale)) * vspace;
    };

    var get_x = current_map.tmap;

    var offset = 0;
    var appended_offset = 0;

    var root = data_tree.nodes[atoms[0].mid];

    each_descendant_reverse(root, function(n) {
        if(n.circular_expand) {
            if(n.timeline === null || n.timeline === undefined) {
                var space = calculate_lines(n, null, get_x, null, false);
                n.space = space;
            }
            var doffset1 = ymap(n.space[0]) + 2;
            var doffset2 = ymap(n.space[1]) + 2;
            if(doffset1 < 12) doffset1 = 12;
            if(doffset2 < 10) doffset2 = 10;
            offset += doffset1;
            n.y0 = offset;
            each_descendant(n, function(cnode) {
                cnode.y0 = offset;
            });
            offset += doffset2;
            appended_offset += doffset1 + doffset2 - ymap(n.space[0]) - ymap(n.space[1]);
        }
    });
    vspace *= (1000 - appended_offset) / offset;
    if(vspace < 10) vspace = 10;

    offset = 0;

    each_descendant_reverse(root, function(n) {
        if(n.circular_expand) {
            if(n.timeline === null || n.timeline === undefined) {
                var space = calculate_lines(n, null, get_x, null, false);
                n.space = space;
            }
            var doffset1 = ymap(n.space[0]) + 2;
            var doffset2 = ymap(n.space[1]) + 2;
            if(doffset1 < 12) doffset1 = 12;
            if(doffset2 < 10) doffset2 = 10;
            offset += doffset1;
            n.y0 = offset;
            each_descendant(n, function(cnode) {
                cnode.y0 = offset;
            });
            offset += doffset2;
        }
    });


    var total_height = offset;

    var delta = (1000 - total_height) / 2;
    each_descendant_reverse(root, function(n) {
        if(n.circular_expand) {
            n.y0 += delta;
            each_descendant(n, function(cnode) {
                cnode.y0 += delta;
            });
        }
    });
    // Draw node links.
    for(var i in data_tree.nodes) {
        var node = data_tree.nodes[i];
        if(node.circular_expand) {
            node.x = node.t;
            node.y = node.y0 / 1000;
            each_descendant(node, function(cnode) {
                cnode.y = node.y;
                cnode.x = cnode.t;
            });
        }
    }
    return {
        ymap: ymap,
        vspace: vspace,
        get_x: get_x
    };
};

// Draw the timeline view, main render function.
var draw_this_layout = function(canvas) {
    var layout_data = perform_this_layout();

    // adjust canvas size.
    var W = canvas._width;
    var H = canvas._height;

    var ctx = canvas.getContext('2d');

    var vspace = layout_data.vspace;

    var ymap_scaler = (current_map.ymap(1) - current_map.ymap(0)) / 1000;
    var ymap = function(y) {
        return layout_data.ymap(y) * ymap_scaler;
    }
    var get_x = layout_data.get_x;
    var external_ymap = current_map.ymap;

    // Draw node links.
    for(var i in data_tree.nodes) {
        var node = data_tree.nodes[i];
        if(node.circular_expand) {
            node.shown = true;
            pixel_select_buffer_addnode(node);
        }
        // Link parent.
        if(node.circular_expand && node.parent) {
            var p = data_tree.nodes[node.parent];
            var x0 = get_x(p.t);
            var x1 = get_x(node.t);
            var yn = external_ymap(node.y);
            var yp = external_ymap(p.y);
            ctx.beginPath();
            ctx.moveTo(x0, yp);
            ctx.quadraticCurveTo(x0, yn, x1, yn);
            var color = get_node_color(node);
            ctx.strokeStyle = color.toRGBA(0.5);
            ctx.stroke();
        }
    }
    // Stage 1, Stage 2, call stroke lines.
    for(var i in data_tree.nodes) {
        var n = data_tree.nodes[i];
        if(n.circular_expand) {
            stroke_lines(n, ctx, get_x, external_ymap(n.y), ymap, true);
        }
    }
    for(var i in data_tree.nodes) {
        var n = data_tree.nodes[i];
        if(n.circular_expand) {
            stroke_lines(n, ctx, get_x, external_ymap(n.y), ymap, false);
        }
    }

    need_rebuild_timeline = false;
};

draw_curves = function(canvas, nrb) {
    need_rebuild_timeline = need_rebuild_timeline || nrb;
    draw_this_layout(canvas);
}

return {
    render: draw_curves,
    layout: function() {
        perform_this_layout();
    },
    set: function(key, value) {
        if(key == "threshold_split") {
            draw_info.threshold_split = value;
            need_rebuild_timeline = true;
            return true;
        }
    }
};
})();
