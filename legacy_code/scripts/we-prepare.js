// Data format: array of tweets, each:
// [ id, mid, uid, parent, type, created_at,
//      user_created_at, followers_count,
//      statuses_count, friends_count, username, text ]

// Useful variables:
// `atoms`: Object of each tweet.

current_loaded_data = { data: data, fields: data_fields };
try {
    window.localStorage.setItem("we-data", JSON.stringify(current_loaded_data));
    window.localStorage.setItem("we-metadata", JSON.stringify({
        event: G_zxcname,
        timestamp: new Date().getTime()
    }));
} catch(e) { console.trace(e); }


// Data Conversion.
var array2object = function(arr, refs) {
    var obj = {};
    for(var i in refs) {
        obj[refs[i]] = arr[i];
    }
    return obj;
}

// ### Reformat data.

// Array of all tweet objects.
var atoms = [];
// Min, max time.
var tmin = 1e100;
var tmax = -1e100;
// Dates (corresponding to atoms).
var dats = [];
// Follower counts (corresponding to atoms).
var fcs = [];
var id_map = {};

// Generate the above.
for(var i in data) {
    var obj = array2object(data[i], data_fields);
    if(obj.type & 1 == 0 && obj.type != 0) continue;
    id_map[obj.id] = obj;
    obj.children = [];
    atoms.push(obj);
}
for(var i in atoms) {
    var a = atoms[i];
    var repost = a.parent;
    if(repost != null && id_map[repost] != null) {
        id_map[repost].children.push(atoms[i].id);
    }
}

for(var i in atoms) {
    var t = atoms[i].t;
    if(tmin > t) tmin = t;
    if(tmax < t) tmax = t;
    fcs.push(atoms[i].followers_count);
    dats.push(t);
}

// Generate Timeline.
var timeline_data = {};
tmax = tmin + G_duration;
var sdats = dats.slice().sort();
if(sdats.length >= 5) {
    var tm = sdats[Math.floor(sdats.length * 0.8)];
    tmax = tmin + (tm - tmin) * 3;
    if(tmax > sdats[sdats.length - 1])
        tmax = sdats[sdats.length - 1];
}

timeline_data.start = tmin;
timeline_data.end = tmax;
var s = 200; //(tmax - tmin) / $(window).width();
timeline_data.values_1 = parzen_window(tmin, tmax, 4000, dats, function(x) {
    return Math.exp(-x * x / 2 / s / s)/Math.sqrt(2 * Math.PI) / s;
}, -s * 5, s * 5);
var maxv = 0;
for(var i in timeline_data.values_1) {
    if(timeline_data.values_1[i] > maxv) maxv = timeline_data.values_1[i];
}
timeline_data.scale_1 = maxv;
timeline_data.lines = [
    { name: 'Influence', suffix: '_1' }
];
loadTimeline(timeline_data);

// ### Generate nonlinear time mapping.

// Integrate time for nonlinear view.
var timeline_integrate = [];
timeline_integrate[0] = 0;
for(var i = 1; i < timeline_data.values_1.length; i++) {
    timeline_integrate.push(timeline_integrate[i - 1] + timeline_data.values_1[i] + timeline_data.values_1[i - 1]);
}
for(var i = 0; i < timeline_integrate.length; i++) {
    timeline_integrate[i] /= timeline_integrate[timeline_integrate.length - 1];
}

// Resample and smoothing.
timeline_integrate = linear_resample(timeline_integrate, 400);

for(var i = 0; i < 10; i++) {
    timeline_integrate = lap_smooth(timeline_integrate, 0.1);
}

// input time [t0,t1], return [0,1]
var nonlinear_tmap = function(t) {
    var s = (t - tmin) / (tmax - tmin);
    if(s <= 0 || s >= 1) return s;
    var idx = s * (timeline_integrate.length - 1);
    var k = Math.floor(idx);
    if(k == timeline_integrate.length - 1) return 1;
    var ip = idx - k;
    var r = timeline_integrate[k] * (1 - ip) + timeline_integrate[k + 1] * ip;
    return r;
}
var nonlinear_itmap = function(s) {
    if(s <= 0 || s >= 1) return s;
    var lb = 0, hb = timeline_integrate.length - 1;
    while(hb - lb > 0) {
        var m = Math.floor((lb + hb) / 2);
        if(timeline_integrate[m] > s) {
            hb = m - 1;
        } else {
            if(lb == m) break;
            lb = m;
        }
    }
    hb = lb + 1;
    var v = (s - timeline_integrate[lb]) / (timeline_integrate[hb] - timeline_integrate[lb]);
    var idx = lb * (1 - v) + hb * v;
    return idx / (timeline_integrate.length - 1) * (tmax - tmin) + tmin;
}

// ### Layout our Graph.
var data_tree = {};
data_tree.start = tmin;
data_tree.end = tmax;
// nodes: id => node { t, children:[ids...] }
data_tree.nodes = id_map;

data_tree = (function(data) {
    var r = { start: data.start, end: data.end, nodes: {} };
    for(var i in data.nodes) {
        var node = data.nodes[i];
        var text = node.text;
        if(text == "转发微博" || text == "转发" || text.toLowerCase() == "repost") text = "";
        r.nodes[i] = {
            id: i,
            uid: node.uid,
            mid: node.mid,
            type: node.type,
            t: node.t,
            children: [],
            text: text,
            words: node.words,
            comments_count: node.comments_count,
            reposts_count: node.reposts_count,
            username: node.username,
            followers_count: node.followers_count,
            verified: node.verified,
            city: node.city,
            province: node.province,
            gender: node.gender,
            emotion: node.emotion
        };
        for(var j in node.children) {
            var ref = node.children[j];
            r.nodes[i].children.push(ref);
        }
        r.nodes[i].children.sort(function(x, y) { return data.nodes[x].t - data.nodes[y].t; });
    }
    for(var i in r.nodes) {
        for(var j in r.nodes[i].children) {
            r.nodes[r.nodes[i].children[j]].parent = i;
        }
        r.nodes[i].children_count = r.nodes[i].children.length;
        r.nodes[i].text_length = r.nodes[i].text.length;
    }
    return r;
})(data_tree);

(function() {
    var get_level_for_node = function(node) {
        if(!node.parent) {
            node.level = 0;
            return 0;
        }
        var l = get_level_for_node(data_tree.nodes[node.parent]) + 1;
        node.level = l;
        return l;
    };
    for(var i in data_tree.nodes) {
        get_level_for_node(data_tree.nodes[i]);
    }
})();

var root_nodes = [];
for(var id in data_tree.nodes) {
    var n = data_tree.nodes[id];
    if(!n.parent) root_nodes.push(id);
}

var max_children_count = 0;
for(var i in data_tree.nodes) {
    if(data_tree.nodes[i].children.length > max_children_count) {
        max_children_count = data_tree.nodes[i].children.length;
    }
}


// Gather authors.
var authors = {};
var authors_info = {};
for(var i in data_tree.nodes) {
    var node = data_tree.nodes[i];
    if(authors[node.uid] == undefined) authors[node.uid] = [];
    authors[node.uid].push(i);
}
for(var i in authors) {
    var first = data_tree.nodes[authors[i][0]];
    var info = {
        reposts : 0,
        followers_count : first.followers_count,
        screen_name : first.username,
        verified : first.verified,
        city : first.city,
        province : first.province,
        uid: i,
        nodes: authors[i].length
    };
    for(var j in authors[i]) {
        var node = data_tree.nodes[authors[i][j]];
        info.reposts += node.children.length;
    }
    authors_info[i] = info;
}
