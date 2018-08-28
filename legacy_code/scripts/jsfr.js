// Javascript implementation of the Fruchterman Reingold Algorithm.
// By Donghao.Ren
// References:
//  Fruchterman, T. M. J., & Reingold, E. M. (1991). Graph Drawing by Force-Directed Placement. Software: Practice and Experience, 21(11).

// Nodes:
//   n      : number of nodes, identified with 0 to N - 1
//   edges  : [[v1, v2], ...]
//   params : { attraction = 0.75, repulsion = 0.75, max_iterations = 800, size = 1 }

var jsfr_initialize = function(n,edges,params) {
    // Load parameters.
    var size = 1;
    var speed = 50;
    var gravity = 0;
    if(params != undefined) {
        if(params.size != undefined) size = params.size;
        if(params.speed != undefined) speed = params.speed;
        if(params.gravity != undefined) gravity = params.gravity;
    }
    var area = size * size;
    var AREA_MULTIPLICATOR = 10000;
    var SPEED_DIVISOR = 800;
    // Initialize.
    //var temperature = size / 10;
    var epsilon = 0.000001;
    var nodes = new Array();
    // Node: x y dx dy radius
    if(params != undefined && params.radius != undefined) {
        // Load initial position.
        for(var i = 0; i < n; i++) {
            nodes.push([ Math.random() * size, Math.random() * size, 0, 0, params.radius[i], 0, 0, 0 ]);
        }
    } else {
        // Random positions.
        for(var i = 0; i < n; i++) {
            // px, py, vx, vy, radius, is_fixed, rotation, drotation
            nodes.push([ Math.random() * size, Math.random() * size, 0, 0, 1, 0, 0, 0 ]);
        }
    }
    var max_displace = Math.sqrt(AREA_MULTIPLICATOR * area) / 10.0;
    var k = Math.sqrt(AREA_MULTIPLICATOR * area) / (1 + n);
    if(params.k) k = params.k;

    var context = {
        k: k,
        size: size, speed: speed, gravity: gravity,
        area: area,
        AREA_MULTIPLICATOR: AREA_MULTIPLICATOR,
        SPEED_DIVISOR: SPEED_DIVISOR,
        epsilon: epsilon,
        nodes: nodes,
        edges: edges,
        anchors: params.anchors,
        // append one user, suppose edges is already changed.
        append : function(x, y) {
            if(x == undefined) x = Math.random() * this.size;
            if(y == undefined) y = Math.random() * this.size;
            this.nodes.push([ x + Math.random() - 0.5, y + Math.random() - 0.5, 0, 0, 0, 0, 0, 0 ]);
        },
        iterate : function(d_divisor) {
            var size = this.size;
            var speed = this.speed;
            var gravity = this.gravity;
            var area = this.area;
            var f = this.f;
            var AREA_MULTIPLICATOR = this.AREA_MULTIPLICATOR;
            var SPEED_DIVISOR = this.SPEED_DIVISOR;
            var epsilon = this.epsilon;
            var nodes = this.nodes;
            var edges = this.edges;
            var anchors = this.anchors;
            var k = this.k;
            var n = nodes.length;
            // Cleanup forces.
            for(var i = 0; i < n; i++) {
                nodes[i][2] = 0;
                nodes[i][3] = 0;
                nodes[i][7] = 0;
            }
            // Calculate repulsive forces.
            for(var i = 0; i < n; i++) {
                for(var j = 0; j < n; j++) {
                    if(i == j) continue;
                    var dx = nodes[i][0] - nodes[j][0];
                    var dy = nodes[i][1] - nodes[j][1];
                    var d = Math.sqrt(dx * dx + dy * dy);
                    if(d < nodes[i][4] + nodes[j][4]) {
                        d *= Math.exp(d - (nodes[i][4] + nodes[j][4]));
                    }
                    if(d < epsilon) d = epsilon;
                    var f = k * k / d;
                    nodes[i][2] += dx / d * f;
                    nodes[i][3] += dy / d * f;
                }
            }
            // Calculate attractive forces.
            for(var e = 0; e < edges.length; e++) {
                var i = edges[e][0];
                var j = edges[e][1];
                var x0 = nodes[i][0];
                var y0 = nodes[i][1];
                var x1 = nodes[j][0];
                var y1 = nodes[j][1];
                var rx0, ry0, rx1, ry1;
                if(anchors) {
                    var ae = anchors[e];
                    rx0 = ae[0] * Math.cos(nodes[i][6]) - ae[1] * Math.sin(nodes[i][6]);
                    ry0 = ae[0] * Math.sin(nodes[i][6]) + ae[1] * Math.cos(nodes[i][6]);
                    rx1 = ae[2] * Math.cos(nodes[j][6]) - ae[3] * Math.sin(nodes[j][6]);
                    ry1 = ae[2] * Math.sin(nodes[j][6]) + ae[3] * Math.cos(nodes[j][6]);
                    x0 += rx0; y0 += ry0;
                    x1 += rx1; y1 += ry1;
                }
                var dx = x0 - x1;
                var dy = y0 - y1;
                var d = Math.sqrt(dx * dx + dy * dy);
                if(d < epsilon) d = epsilon;
                var f = (d * d) / k;
                dx = (dx / d) * f;
                dy = (dy / d) * f;

                if(anchors) {
                    var t1 = -rx0 * dy + ry0 * dx;
                    var t2 = rx1 * dy - ry1 * dx;
                    nodes[i][7] += t1;
                    nodes[j][7] += t2;
                }

                nodes[i][2] -= dx;
                nodes[i][3] -= dy;
                nodes[j][2] += dx;
                nodes[j][3] += dy;
            }
            // Gravity
            for(var i = 0; i < n; i++) {
                var dx = nodes[i][0];
                var dy = nodes[i][1];
                dx = 0;
                var d = Math.sqrt(dx * dx + dy * dy);
                if(d < epsilon) d = epsilon;
                var f = 0.01 * k * gravity * d;
                nodes[i][2] -= dx / d * f;
                nodes[i][3] -= dy / d * f;
            }
            for(var i = 0; i < n; i++) {
                nodes[i][2] *= speed / SPEED_DIVISOR;
                nodes[i][3] *= speed / SPEED_DIVISOR;
                nodes[i][7] *= speed / SPEED_DIVISOR;
            }
            // Update positions.
            for(var i = 0; i < n; i++) {
                var vx = nodes[i][2];
                var vy = nodes[i][3];
                var d = Math.sqrt(vx * vx + vy * vy);
                if(d < epsilon) d = epsilon;
                var dl = Math.min(max_displace * (speed / SPEED_DIVISOR), d);
                var dx = vx / d * dl;
                var dy = vy / d * dl;
                var nx = nodes[i][0] + dx;
                var ny = nodes[i][1] + dy;
                if(!nodes[i][5]) {
                    nodes[i][0] = nx;
                    nodes[i][1] = ny;
                }
                nodes[i][6] += nodes[i][7] * 0.001;
                while(nodes[i][6] < 0) nodes[i][6] += Math.PI * 2;
                while(nodes[i][6] > Math.PI * 2) nodes[i][6] -= Math.PI * 2;
            }
        }
    };
    return context;
};

var jsfr_run = function(n,edges,params) {
    ctx = jsfr_initialize(n, edges, params);
    for(var i = 0; i < n * 2; i++) ctx.iterate();
    return ctx.nodes;
};
