// ### Layout

// In this file, we define the three different layout methods.

// ## Sail layout (sail-span).
var layout_span = function(r) {
    var ids = [];
    for(var i in r.nodes) ids.push(i);
    ids.sort(function(x, y) { return r.nodes[x].t - r.nodes[y].t; });
    var current_y = 0;
    for(var i in ids) {
        var id = ids[i];
        r.nodes[id].y = undefined;
    }
    for(var i in ids) {
        var id = ids[i];
        var span = r.nodes[id].children.length;//, 0.7) / 100;
        if(r.nodes[id].y == undefined) {
            r.nodes[id].y = current_y;
            current_y += span;
        }
        for(var j in r.nodes[id].children) {
            var nj = r.nodes[r.nodes[id].children[j]];
            if(r.nodes[id].children.length == 1) nj.y = r.nodes[id].y;
            else nj.y = r.nodes[id].y + (1 - j / (r.nodes[id].children.length - 1)) * span;
        }
    }
    var ymin = 0, ymax = 0.001;
    for(var id in r.nodes) {
        var n = r.nodes[id];
        if(ymin > n.y) ymin = n.y;
        if(ymax < n.y) ymax = n.y;
    }
    for(var id in r.nodes) {
        var n = r.nodes[id];
        n.y = (n.y - ymin) / (ymax - ymin);
        n.x = n.t;
    }
    return r;
};

// Tree layout (tree).
var layout_tree = function(r) {
    var ids = [];
    for(var i in r.nodes) ids.push(i);
    ids.sort(function(x, y) { return r.nodes[x].t - r.nodes[y].t; });
    for(var i in ids) {
        var id = ids[i];
        var n = r.nodes[id];
        n.x = undefined;
        n.y = undefined;
        n.occupy_count = false;
        n.total_nodes = false;
    }
    var count_occupy = function(node) {
        if(node.occupy_count) return node.occupy_count;
        var c = 1;
        var ch_c = 0;
        for(var i in node.children) {
            ch_c += count_occupy(r.nodes[node.children[i]]);
        }
        return node.occupy_count = Math.max(c, ch_c);
    }
    var nch2x = function(n) {
        return Math.log(1 + 10 * n);
    }
    var layout_children = function(node, l, alpha_center, alpha_span) {
        var alpha1 = alpha_center - alpha_span / 2;
        var alpha2 = alpha_center + alpha_span / 2;
        var total_occupy_children = 0;
        for(var i in node.children) {
            var cnode = r.nodes[node.children[i]];
            total_occupy_children += count_occupy(cnode);
        }
        total_occupy_children += 2;
        var total_accum = 1;
        for(var i = node.children.length - 1; i >= 0; i--) {
            var cnode = r.nodes[node.children[i]];
            total_accum += cnode.occupy_count / 2;
            var alpha = (total_accum / total_occupy_children) * (alpha2 - alpha1) + alpha1;
            cnode.x = l;
            cnode.y = alpha;
            layout_children(cnode, l + nch2x(cnode.children.length), alpha, cnode.occupy_count / total_occupy_children * alpha_span);
            total_accum += cnode.occupy_count / 2;
        }
    }
    for(var i in ids) {
        var id = ids[i];
        var n = r.nodes[id];
        if(!n.y) {
            n.x = 0; n.y = 0;
            layout_children(n, nch2x(n.children.length), 0, Math.PI);
        }
    }
    var ymin = 0, ymax = 0.001;
    var xmin = 0, xmax = 0.001;
    for(var id in r.nodes) {
        var n = r.nodes[id];
        if(xmin > n.x) xmin = n.x;
        if(xmax < n.x) xmax = n.x;
        if(ymin > n.y) ymin = n.y;
        if(ymax < n.y) ymax = n.y;
    }
    for(var id in r.nodes) {
        var n = r.nodes[id];
        n.x = (n.x - xmin) / (xmax - xmin);
        n.y = (n.y - ymin) / (ymax - ymin);
    }
};

// Circular layout (circular).
var layout_circular_scale;
var layout_circular_recompute;
var layout_circular_save_skeleton;
var layout_circular_load_skeleton;
var layout_circular_get_position;
var layout_circular_threshold = 50;//e100;
var layout_circular_threshold_attribute = null;
var layout_circular = function(r) {
    var ids = [];
    for(var i in r.nodes) ids.push(i);
    ids.sort(function(x, y) { return r.nodes[x].t - r.nodes[y].t; });
    for(var i in ids) {
        var id = ids[i];
        var n = r.nodes[id];
        n.x = undefined;
        n.y = undefined;
        n.circular_expand = false;
        n.occupy_count = false;
        n.total_nodes = false;
        n.count_depth_cache = false;
    }
    for(var i in ids) {
        var id = ids[i];
        var n = r.nodes[id];
        if(layout_circular_threshold_attribute) {
            if(n[layout_circular_threshold_attribute] > layout_circular_threshold || i == 0) n.circular_expand = true;
        } else {
            if(n.children.length > layout_circular_threshold || i == 0) n.circular_expand = true;
        }
    }
    var count_occupy = function(node) {
        if(node.occupy_count) return node.occupy_count;
        var c = 1;
        var ch_c = 0;
        for(var i in node.children) {
            var rn = r.nodes[node.children[i]];
            if(!rn.circular_expand)
                ch_c += count_occupy(rn);
        }
        return node.occupy_count = Math.max(c, ch_c);
    }
    var count_total_nodes = function(node) {
        if(node.total_nodes) return node.total_nodes;
        var c = 1;
        for(var i in node.children) {
            var rn = r.nodes[node.children[i]];
            if(!rn.circular_expand)
                c += count_total_nodes(rn);
        }
        return node.total_nodes = c;
    }
    var count_node_depth = function(node) {
        if(node.count_depth_cache) return node.count_depth_cache;
        var depth = 1;
        for(var i in node.children) {
            var rn = r.nodes[node.children[i]];
            if(!rn.circular_expand) {
                var cdepth = count_node_depth(rn) + 1;
                if(depth < cdepth) depth = cdepth;
            }
        }
        return node.count_depth_cache = depth;
    }
    var compute_maxr = function(node) {
        //return (Math.pow(count_total_nodes(node), 0.5) / 10 + 1);
        var d = 1 - Math.exp(-count_node_depth(node) / 3);
        return d * (Math.pow(count_total_nodes(node), 0.5) / 10 + 1);
    }
    var layout_node = function(node, x, y, rotation) {
        if(rotation === undefined) rotation = 0;
        var radius = compute_maxr(node);
        var max_distance = 0;
        var place_children = function(n, l, theta_center, theta_span) {
            var count_nonexpand = 0;
            var count_occupy_total = 0;
            for(var i in n.children) {
                var c = r.nodes[n.children[i]];
                if(!c.circular_expand) {
                    count_nonexpand++;
                    count_occupy_total += count_occupy(c);
                }
            }
            var no_delta = false;
            if(l == 1) {
                theta_span = Math.PI * 2 * count_nonexpand / 100;
                theta_span = Math.min(theta_span, Math.PI * 5);
                if(theta_span < Math.PI * 2) {
                    theta_span = Math.PI * 2;
                    no_delta = true;
                }
            }


            var theta1 = theta_center - theta_span / 2;
            var theta2 = theta_center + theta_span / 2;
            var index = 0;
            var f_l = function(l) {
                return 1 - Math.exp(-l / 3);
            }
            var count_occupy_current = 0;
            for(var i in n.children) {
                var c = r.nodes[n.children[i]];
                if(c.circular_expand == false) {
                    count_occupy_current += count_occupy(c) / 2;
                    var theta = (count_occupy_current) / count_occupy_total * (theta2 - theta1) + theta1;
                    var delta = 0;
                    var dl = 1;
                    if(l == 1 && !no_delta) {
                        delta = -(count_nonexpand - (index + 0.5)) / count_nonexpand * (f_l(l) - f_l(l - 1)) * 0.5;
                        dl = -(count_nonexpand - (index + 0.5)) / count_nonexpand * 0.5 + 1;
                    }
                    var distance = radius * (f_l(l) + delta);
                    c.x = x + distance * Math.cos(theta + rotation);
                    c.y = y + distance * Math.sin(theta + rotation);
                    if(distance > max_distance) {
                        max_distance = distance;
                    }
                    var new_span = theta_span * count_occupy(c) / count_occupy_total * 0.8;
                    new_span = Math.min(Math.PI / 4, new_span);
                    place_children(c, l + dl, theta, new_span);
                    count_occupy_current += count_occupy(c) / 2;
                    index++;
                }
            }
        };
        node.x = x;
        node.y = y;
        place_children(node, 1, 0);
        node.max_distance = max_distance;
        radius *= radius / (max_distance + 0.1);
        place_children(node, 1, 0);
    }

    // Initial, all nodes at origin.
    for(var i in ids) {
        var id = ids[i];
        var n = r.nodes[id];
        if(n.circular_expand) {
            layout_node(n, 0, 0);
        }
    }

    var major_nodes = [];
    var major_radius = [];
    var major_edges = [];
    var edge_anchors = [];
    var major_size = 0;
    for(var i in ids) {
        var id = ids[i];
        var n = r.nodes[id];
        if(n.circular_expand) {
            n.fr_algo_id = major_nodes.length;
            n.circular_radius = compute_maxr(n);
            major_nodes.push(n);
            major_radius.push(n.circular_radius * 1.2);
            major_size += n.circular_radius;
        }
    }
    for(var i in ids) {
        var id = ids[i];
        var n = r.nodes[id];
        if(n.circular_expand) {
            var p = n.parent ? r.nodes[n.parent] : null;
            var p0 = p;
            while(p && p.circular_expand == false) p = r.nodes[p.parent];
            if(p) {
                major_edges.push([p.fr_algo_id, n.fr_algo_id]);
                edge_anchors.push([p0.x - p.x, p0.y - p.y, 0, 0]);
            }
        }
    }
    var fr = jsfr_initialize(major_nodes.length, major_edges, { radius: major_radius, anchors: edge_anchors, k: major_size / major_nodes.length * 10 });
    fr.nodes[0][0] = 0;
    fr.nodes[0][1] = 0;
    fr.nodes[0][5] = 1;

    for(var i = 1; i < major_nodes.length; i++) {
        var theta = Math.PI * 2 * i / major_nodes.length;
        fr.nodes[i][0] = Math.cos(theta);
        fr.nodes[i][1] = Math.sin(theta);
    }

    fr.k = major_size / major_nodes.length * 0.1;
    for(var i = 0; i < major_nodes.length * 20 + 20; i++) fr.iterate();

    fr.k = major_size / major_nodes.length * 10;
    for(var i = 0; i < major_nodes.length * 20 + 20; i++) fr.iterate();

    fr.k = major_size / major_nodes.length;
    for(var i = 0; i < major_nodes.length * 50 + 200; i++) fr.iterate();

    for(var i in fr.nodes) {
        major_nodes[i].x = fr.nodes[i][0];
        major_nodes[i].y = fr.nodes[i][1];
        major_nodes[i].rotation = fr.nodes[i][6];
    }

    for(var i in ids) {
        var id = ids[i];
        var n = r.nodes[id];
        if(n.circular_expand) {
            layout_node(n, n.x, n.y, n.rotation);
        }
    }
    var ymin = 1e100, ymax = -1e100;
    var xmin = 1e100, xmax = -1e100;
    for(var id in r.nodes) {
        var n = r.nodes[id];
        if(xmin > n.x) xmin = n.x;
        if(xmax < n.x) xmax = n.x;
        if(ymin > n.y) ymin = n.y;
        if(ymax < n.y) ymax = n.y;
    }
    if(ymax - ymin > xmax - xmin) {
        var xmid = (xmin + xmax) / 2;
        xmax = xmid + (ymax - ymin) / 2;
        xmin = xmid - (ymax - ymin) / 2;
    } else {
        var ymid = (ymin + ymax) / 2;
        ymax = ymid + (xmax - xmin) / 2;
        ymin = ymid - (xmax - xmin) / 2;
    }
    layout_circular_scale = 1.0 / (xmax - xmin);
    for(var id in r.nodes) {
        var n = r.nodes[id];
        n.x = (n.x - xmin) / (xmax - xmin);
        n.y = (n.y - ymin) / (ymax - ymin);
    }
    layout_circular_recompute = function() {
        for(var id in r.nodes) {
            var n = r.nodes[id];
            n.x = n.x * (xmax - xmin) + xmin;
            n.y = n.y * (ymax - ymin) + ymin;
            n.total_nodes = undefined;
            n.occupy_count = undefined;
            n.count_depth_cache = undefined;
        }
        for(var i in ids) {
            var id = ids[i];
            var n = r.nodes[id];
            if(n.circular_expand) {
                n.circular_radius = compute_maxr(n);
                layout_node(n, n.x, n.y, n.rotation);
            }
        }
        for(var id in r.nodes) {
            var n = r.nodes[id];
            n.x = (n.x - xmin) / (xmax - xmin);
            n.y = (n.y - ymin) / (ymax - ymin);
        }
    }
    layout_circular_get_position = function(n) {
        var orig_x = n.x * (xmax - xmin) + xmin;
        var orig_y = n.y * (ymax - ymin) + ymin;
        return {
            x : orig_x,
            y : orig_y,
            radius : compute_maxr(n)
        };
    };
    layout_circular_save_skeleton = function() {
        var rslt = { };
        for(var id in r.nodes) {
            var n = r.nodes[id];
            if(n.circular_expand) {
                var orig_x = n.x * (xmax - xmin) + xmin;
                var orig_y = n.y * (ymax - ymin) + ymin;
                rslt[id] = {
                    x : orig_x,
                    y : orig_y,
                    rotation: n.rotation,
                    radius : compute_maxr(n)
                };
            }
        }
        return rslt;
    };
    layout_circular_load_skeleton = function(skeleton) {
        for(var id in r.nodes) {
            var n = r.nodes[id];
            if(skeleton[id]) {
                var t = skeleton[id];
                n.circular_expand = true;
                n.x = (t.x - xmin) / (xmax - xmin);
                n.y = (t.y - ymin) / (ymax - ymin);
                n.rotation = t.rotation;
            } else {
                n.circular_expand = false;
            }
        }
        layout_circular_recompute();
    };
};
