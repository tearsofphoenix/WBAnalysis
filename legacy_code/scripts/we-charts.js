// Simple Charts

var chart_width = 220;

var createCanvasFixedWidthHeight = function(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width * view_scaling;
    canvas.height = height * view_scaling;
    canvas._width = width;
    canvas._height = height;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(view_scaling, 0, 0, view_scaling, 0, 0);
    $(canvas).css({
        "width": width + "px",
        "height": height + "px"
    });
    return canvas;
};

var SimpleBarChart = function(width, names, categories, data, weights) {
    // Prepare statistics.
    var counts = { };
    categories.forEach(function(c) { counts[c] = 0; });
    if(weights) {
        for(var i = 0; i < data.length; i++) {
            var d = data[i];
            if(counts[d] !== undefined)
                counts[d] += weights[i];
        }
    } else {
        data.forEach(function(d) { if(counts[d] !== undefined) counts[d] += 1; });
    }
    var max_count = 0;
    var total_count = 0;
    for(var i in counts) {
        if(counts[i] > max_count) max_count = counts[i];
        total_count += counts[i];
    }
    var len = categories.length;
    // Create canvas.
    var spacing = 2;
    var bar_height = 16;

    var canvas = createCanvasFixedWidthHeight(width, bar_height * len + spacing * (len + 1));
    var ctx = canvas.getContext("2d");
    // Calculate dimensions.
    var redraw = function() {
        ctx.font = "11px Arial";
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var max_w = 30;
        for(var i = 0; i < categories.length; i++) {
            var w = ctx.measureText(names[i]).width;
            if(w > max_w) max_w = w;
        }
        max_w += 2;

        for(var i = 0; i < categories.length; i++) {
            var x0 = max_w + 4;
            var w = (canvas._width - max_w - 5) * counts[categories[i]] / max_count;
            var y0 = spacing + i * (bar_height + spacing);
            ctx.fillStyle = Colors.node.normal.toRGBA(0.2);
            ctx.strokeStyle = Colors.node.normal.toRGBA();
            ctx.fillRect(x0, y0, w, bar_height);
            ctx.beginPath();
            ctx.moveTo(x0 + w, y0);
            ctx.lineTo(x0 + w, y0 + bar_height);
            ctx.stroke();
            ctx.textAlign = "right";
            var y_text = y0 + 11;
            ctx.fillStyle = Colors.foreground.toRGBA(0.8);
            ctx.fillText(names[i], max_w, y_text);
            ctx.fillStyle = Colors.node.normal.toRGBA();
            var count_text = counts[categories[i]].toFixed(2).replace(/\.?0+$/, '') + " (" + (counts[categories[i]] / total_count * 100).toFixed(0) + "%)";
            if(w > ctx.measureText(count_text).width + 4) {
                ctx.textAlign = "right";
                ctx.fillText(count_text, x0 + w - 5, y_text);
            } else {
                ctx.textAlign = "left";
                ctx.fillText(count_text, x0 + w + 5, y_text);
            }

        }
    }
    redraw();
    canvas.redraw = redraw;
    return canvas;
};

var create_chart = function(info) {
    var w = info.width === undefined ? chart_width : info.width;
    if(info.type == "bars") {
        return SimpleBarChart(w, info.names, info.values, info.data, info.weights);
    }
};

$("#charts").children().remove();

$("#charts").append($("<h2 />").text("认证比例"));
$("#charts").append($(create_chart({
    type: "bars",
    names: ["普通", "VIP"],
    values: ["普通", "VIP"],
    data: atoms.map(function(a) {
        return a.verified ? "VIP" : "普通";
    })
})));

var all_ids = [];
for(var id in data_tree.nodes) all_ids.push(id);
$("#charts").append($("<h2 />").text("转发层级"));
$("#charts").append($(create_chart({
    type: "bars",
    names: ["1", "2", "3", "4", "5", ">=6"],
    values: [1,2,3,4,5,6],
    data: all_ids.map(function(id) {
        var depth = data_tree.nodes[id].level;
        if(depth >= 6) depth = 6;
        return depth.toString();
    })
})));
$("#charts").append($("<h2 />").text("性别比例"));
$("#charts").append($(create_chart({
    type: "bars",
    names: ["男", "女", "未知"],
    values: ["男", "女", "未知"],
    data: all_ids.map(function(id) {
        if(data_tree.nodes[id].gender == "m") return "男";
        if(data_tree.nodes[id].gender == "f") return "女";
        return "未知";
    })
})));

{{include: data-chinamap.js}}

var ProvinceDensityMap = function(provinces) {
    var width = chart_width;
    var height = Math.round(width * 0.75);
    var canvas = createCanvasFixedWidthHeight(width, height);
    var ctx = canvas.getContext("2d");
    var p = { };
    for(var i in DATA_ChinaProvinces) {
        p[i] = {
            name: DATA_ChinaProvinces[i].name,
            coordinates: DATA_ChinaProvinces[i].coordinates,
            count: 0
        };
    }
    provinces.forEach(function(i) { if(p[i]) p[i].count += 1 });
    var max_count = 0;
    for(var i in p) {
        if(p[i].count > max_count) max_count = p[i].count;
    }
    var redraw = function() {
        ctx.font = "11px Arial";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for(var idx in p) {
            var d = p[idx];
            ctx.fillStyle = Colors.background.interp(Colors.node.normal, p[idx].count / max_count).toRGBA();
            ctx.strokeStyle = Colors.panel_background.toRGBA();
            ctx.lineWidth = 1;
            d.coordinates.forEach(function(cs) {
                ctx.beginPath();
                for(var i = 0; i < cs.length; i++) {
                    var x = cs[i][0] / 180.0 * Math.PI;
                    var y = Math.log(Math.tan(Math.PI / 4 + cs[i][1] / 180.0 * Math.PI / 2));
                    x = width / 2 + (x - 1.82) * 200;
                    y = height / 2 - (y - 0.71) * 200;
                    if(i == 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
        }
    };
    redraw();
    canvas.redraw = redraw;
    return canvas;
};

$("#charts").append($("<h2 />").text("省份比例"));
$("#charts").append($(ProvinceDensityMap(
    all_ids.map(function(id) {
        return data_tree.nodes[id].province;
    })
)));

WeiboEvents.namedOn("colorscheme-changed", "si", function() {
    $("#charts canvas").each(function() {
        this.redraw();
    });
});

// $("#charts h2").each(function() {
//     var sp = $('<span>添加到视图</span>');
//     var h2 = $(this);
//     var text = h2.text();
//     sp.click(function() {
//         extra_charts.push({
//             img: h2.next(),
//             x: 20, y: 20,
//             title: text
//         });
//         draw_sketchpad_overlay();
//     });
//     $(this).append(sp);
// });

var authors_count = 0;
for(var i in authors) {
    authors_count++;
}
$(".basic-stat").text(
    "微博数: " + atoms.length + ", 用户数: " + authors_count
);

var saved_custom_chart_code = undefined;
WeiboEvents.namedOn("open-custom-chart-box", "si", function() {
    var p = beginPopup("custom-chart-box");
    if(saved_custom_chart_code)
        p.find('[for="code"]').val(saved_custom_chart_code);
    p.find('[for="cancel"]').click(function() {
        saved_custom_chart_code = p.find('[for="code"]').val();
        endPopup();
    });
    p.find('[for="code"]').mousewheel(function(e) {
        e.stopPropagation();
    });
    p.find('[for="submit"]').click(function() {
        var code = p.find('[for="code"]').val();
        log_user_action("custom-chart", { code: code });
        var func;
        eval("func = " + code);
        if(func) {
            p.find('[for="graph-area"]').children().remove();
            p.find('[for="print"]').text("");
            var tweets = atoms.map(function(obj) {
                var o = WeiboEvents.deepClone(obj);
                o.words = data_tree.nodes[obj.id].words.split(",");
                return o;
            });
            var fx = {
                chart: function(cfg) {
                    cfg.width = p.find('[for="graph-area"]').width();
                    if(cfg.title)
                        p.find('[for="graph-area"]').append($('<h2 />').text(cfg.title));
                    p.find('[for="graph-area"]').append($(create_chart(cfg)));
                },
                print: function(text) {
                    if(typeof(text) != "string") {
                        text = JSON.stringify(text);
                    }
                    var t = p.find('[for="print"]').text();
                    t += text + "\n";
                    p.find('[for="print"]').text(t);
                },
                $pick: function(key) {
                    return function(o) { return o[key]; };
                },
                $equal: function(key, val) {
                    if(val === undefined) // one parameter.
                        return function(d) { return d == key; };
                    else
                        return function(o) { return o[key] == val; };
                },
                zip: function(arrays) {
                    return arrays[0].map(function(_,i){
                        return arrays.map(function(array){return array[i]})
                    });
                },
                keys: function(obj) {
                    var r = [];
                    for(var i in obj) {
                        r.push(i);
                    }
                    return r;
                },
                values: function(obj) {
                    var r = [];
                    for(var i in obj) {
                        r.push(obj[i]);
                    }
                    return r;
                },
                select: function(obj, keys) {
                    return keys.map(function(k) { return obj[k]; });
                },
                min: function(array, f) {
                    if(f) array = array.map(f);
                    var min = array[0];
                    for(var i = 1; i < array.length; i++) {
                        min = Math.min(min, array[i]);
                    }
                    return min;
                },
                max: function(array, f) {
                    if(f) array = array.map(f);
                    var max = array[0];
                    for(var i = 1; i < array.length; i++) {
                        max = Math.max(max, array[i]);
                    }
                    return max;
                },
                sum: function(array, f) {
                    if(f) array = array.map(f);
                    var sum = 0;
                    for(var i = 0; i < array.length; i++)
                        sum += array[i];
                    return sum;
                },
                mean: function(array, f) {
                    if(array.length == 0) return undefined;
                    return this.sum(array, f) / array.length;
                },
                variance: function(array, f) {
                    if(f) array = array.map(f);
                    var ex = this.mean(array);
                    return this.mean(array, function(d) { return d * d; }) - ex * ex;
                },
                std: function(array, f) {
                    return Math.sqrt(this.variance(array, f));
                }
            };
            func(fx, tweets);
        }
    });
});


var exportDataForMakingAudio = function() {
    var all_words = { };
    var tweets = atoms.map(function(obj) {
        var o = WeiboEvents.deepClone(obj);
        o.words = data_tree.nodes[obj.id].words.split(",");
        o.words.forEach(function(w) {
            if(all_words[w] === undefined) all_words[w] = 1;
            else all_words[w] += 1;
        });
        return o;
    });
    var words_inds = [];
    for(var w in all_words) {
        words_inds.push({
            w: w,
            c: all_words[w]
        });
    }
    words_inds.sort(function(a, b) { return b.c - a.c; });
    for(var i = 0; i < words_inds.length; i++) {
        all_words[words_inds[i].w] = i;
    }
    tweets.forEach(function(t) {
        t.words = t.words.map(function(w) { return all_words[w]; });
        delete t.text;
        delete t.original_text;
        delete t.city;
        delete t.province;
        delete t.username;
        delete t.user_description;
        delete t.verified_type;
        delete t.verified_reason;
    });
    tweets.sort(function(a, b) { return a.t - b.t; });
    console.log(JSON.stringify(tweets));
};

G_E = exportDataForMakingAudio;
