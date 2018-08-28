$(document).ready(function() {

var colorschemes = {
    'white' : { // black on white.
        mark_color: 'gray',
        plot_stroke: 'rgb(32,96,213)',
        plot_fill: 'rgba(32,96,213,0.1)',
        time_fill: 'black',
        time_shadow: 'white',
        range_stroke: 'rgba(32,96,213,0.8)',
        range_fill: 'rgba(32,96,213,0.2)',
        tracking_stroke: 'rgba(32,96,213,1)',
        tracking_fill: 'rgba(32,96,213,0.3)',
        current_line: 'black'
    },
    'black' : { // white on black
        mark_color: 'gray',
        plot_stroke: 'rgb(87,131,254)',
        plot_fill: 'rgba(87,131,254,0.2)',
        time_fill: '#AAA',
        range_stroke: 'rgba(87,131,254,0.7)',
        range_fill: 'rgba(87,131,254,0.1)',
        tracking_stroke: 'rgba(87,131,254,1)',
        tracking_fill: 'rgba(87,131,254,0.3)',
        current_line: 'white'
    }
};

var months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
var num_pad = function(s) {
    var j = s.toString();
    while(j.length < 2) j = '0' + j;
    return j;
};
var format_date = function(date) {
    return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear() + " " + num_pad(date.getHours()) + ":" + num_pad(date.getMinutes())
};

$(".pkuvis-timeline").each(function() {
    var elem = this;
    var height = 100;
    var show_yticks = false;
    var cs = colorschemes['white'];
    var conf = {
        track_range: true
    };
    var use_window_width = false;
    $(this).children('span').hide();
    $(this).children('span.set-height').each(function() { height = $(this).html(); });
    $(this).children('span.set-colorscheme').each(function() { cs = colorschemes[$(this).html()]; });
    $(this).children('span.enable-yticks').each(function() { show_yticks = true; });
    $(this).children('span.disable-track-range').each(function() { conf.track_range = false; });
    $(this).children('span.window-width').each(function() { use_window_width = true; });
    $(this).css('height', height + 'px');
    $(this).css('cursor', 'crosshair');
    $(this).append('<canvas class="graph"></canvas>');
    var canvas = $(this).children('.graph')[0];

    var width;
    var canvas_scale_factor = 1.0;
    var ctx = canvas.getContext('2d');

    var set_width_height = function() {
        if(use_window_width) {
            width = $(window).width();
        } else {
            width = $(elem).width();
        }
        canvas_scale_factor = 1.0;
        var g = ctx;
        var dev_ratio = window.devicePixelRatio || 1;
        var backing_ratio = g.webkitBackingStorePixelRatio ||
                            g.mozBackingStorePixelRatio ||
                            g.msBackingStorePixelRatio ||
                            g.oBackingStorePixelRatio ||
                            g.backingStorePixelRatio || 1;
        var ratio = dev_ratio / backing_ratio;
        canvas_scale_factor = ratio;

        canvas.height = height * canvas_scale_factor;
        canvas.width = width * canvas_scale_factor;

        ctx.setTransform(canvas_scale_factor, 0, 0, canvas_scale_factor, 0, 0);

        $(canvas).css("width", width + "px").css("height", height + "px");
    };



    this.timeline_canvas = canvas;

    this.timeline_data = undefined;

    var tl_get_t = function(x) {
        var timeline_data = elem.timeline_data;
        if(timeline_data == undefined) return 0;
        var t0 = timeline_data.start;
        var t1 = timeline_data.end;
        return (x - 10) / (width - 20) * (t1 - t0) + t0;
    };
    var tl_get_x = function(t) {
        var timeline_data = elem.timeline_data;
        if(timeline_data == undefined) return 0;
        var t0 = timeline_data.start;
        var t1 = timeline_data.end;
        return (t - t0) / (t1 - t0)*(width - 20) + 10;
    };

    var is_tracking_range = false;
    var tracking_t0 = 0;
    var tracking_t1 = 0;

    var past_draw_pm = undefined;

    var safe_event = function(e, obj) {
        if(elem[e] != undefined) {
            elem[e](obj);
        }
    };

    var tick_state = 'left';
    var uniform_mag = false;

    this.redraw = function(ptx, ampl) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        past_draw_pm = [ptx, ampl];

        ctx.font = "12px Helvetica";
        var timeline_data = elem.timeline_data;
        if(timeline_data == undefined) return;
        var t0 = timeline_data.start;
        var t1 = timeline_data.end;
        var t_firstday = new Date(t0 * 1000); t_firstday.setHours(12); t_firstday.setMinutes(0); t_firstday.setSeconds(0);
        var tFirstNoon = t_firstday.getTime() / 1000 - 3600 * 24;
        var y_baseline = height - 12;
        var y_scale = 1;
        var y_height = 0;
        var get_x = function(t) {
            return (t - t0) / (t1 - t0) * (width - 20) + 10;
        };
        var x_invert = function(xpix) {
            return (xpix - 10) / (width - 20) * (t1 - t0) + t0;
        };
        if(ptx != undefined) {
            var tanh = function(x) {
                return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x));
            }
            var k = 30;
            if(ampl != undefined) k = ampl * ampl * 30;
            if(k > 60) k = 60;
            var mag = function(x) { return x+k*tanh(x/5)*Math.exp(-x*x/100/k); }
            if(uniform_mag) {
                mag = function(x) { return x+k*x/5; }
            }
            get_x = function(pt) {
                var x = (pt - t0) / (t1 - t0)*(width - 20) + 10;
                x = ptx + 3 * mag((x - ptx) / 3);
                return x;
            }
        };
        var get_y = function(pt) {
            return y_baseline - pt * y_scale;
        }
        var dt_min = (t1 - t0) / ((width - 20) / 2);
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
        var dt = 1440 * 7 * 60, skip = 4;
        for(var i in dts) {
            if(dts[i][0] * 60 > dt_min) {
                dt = dts[i][0] * 60;
                skip = dts[i][1];
                break;
            }
        }
        if(tick_state == 'left') {
            if(ptx > width * 0.6666) tick_state = 'right';
        } else {
            if(ptx < width * 0.3333) tick_state = 'left';
        }
        var draw_timeline = function(vals, density) {
            ctx.strokeStyle = cs.mark_color;
            var cc = 0;
            tt = tFirstNoon;
            while(tt < t1) {
                if(tt >= t0) {
                    ctx.beginPath();
                    var px = get_x(tt);
                    ctx.moveTo(px, y_baseline);
                    ctx.lineTo(px, y_baseline + (cc % skip == 0 ? 10 : 4));
                    ctx.stroke();
                }
                tt += dt;
                cc++;
            }
            ctx.strokeStyle = cs.plot_stroke;
            ctx.fillStyle = cs.plot_fill;
            ctx.beginPath();
            ctx.moveTo(get_x(t0), y_baseline);
            for(var i in vals) {
                var pt = vals[i];
                var t = i / (vals.length - 1) * (t1 - t0) + t0;
                ctx.lineTo(get_x(t), get_y(pt));
            }
            ctx.lineTo(get_x(t1), y_baseline);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            if(show_yticks) {
                if(tick_state == 'left')
                    ctx.textAlign = "left";
                else
                    ctx.textAlign = "right";
                ctx.fillStyle = cs.time_fill;
                ctx.strokeStyle = cs.mark_color;
                var val_scale = y_height / y_scale;
                var p = Math.floor(Math.log(val_scale) / Math.log(10));
                var v0 = Math.pow(10, p) / 10;
                var deltaY = get_y(v0) - get_y(0);
                var scales = [ 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100 ];
                var idx = 1;
                while(Math.abs(deltaY) < 12 && idx < scales.length) {
                    v0 = Math.pow(10, p) * scales[idx];
                    deltaY = get_y(v0) - get_y(0);
                    idx++;
                }
                var v = v0;
                while(v <= val_scale) {
                    var y = get_y(v);
                    if(ptx != undefined) {
                        if(tick_state == 'left') {
                            ctx.beginPath();
                            ctx.moveTo(ptx - 3, y);
                            ctx.lineTo(ptx + 3, y);
                            ctx.stroke();
                            ctx.fillText(v.toPrecision(2), ptx + 5, y + 3);
                        } else {
                            ctx.beginPath();
                            ctx.moveTo(ptx - 3, y);
                            ctx.lineTo(ptx + 3, y);
                            ctx.stroke();
                            ctx.fillText(v.toPrecision(2), ptx - 5, y + 3);
                        }
                    }
                    v += v0;
                }
            }
        };
        if(timeline_data.values != undefined) {
            y_scale = (y_baseline - 12) / timeline_data.scale;
            y_height = (y_baseline - 12);
            draw_timeline(timeline_data.values, timeline_data.density);
        } else {
            var ti = 0;
            for(var i in timeline_data.lines) {
                var desc = timeline_data.lines[i];
                var scale = timeline_data['scale' + desc.suffix];
                var vals = timeline_data['values' + desc.suffix];
                var hh = (height - 12) / timeline_data.lines.length;
                y_baseline = hh * (ti + 1);
                y_scale = (hh - 13) / scale;
                y_height = hh - 13;
                draw_timeline(vals);
                ti++;
            }
        }

        if(elem.custom_draw != undefined) {
            ctx.save();
            elem.custom_draw(ctx, {
                tmap: get_x,
                width: width,
                height: height
            });
            ctx.restore();
        }

        ctx.fillStyle = cs.range_fill;
        ctx.strokeStyle = cs.range_stroke;
        if(elem.range_t0 != undefined && elem.range_t1 != undefined) {
            if((elem.range_t1 - elem.range_t0) / (t1 - t0) < 0.7) {
                var x0 = get_x(elem.range_t0);
                var x1 = get_x(elem.range_t1);
                ctx.fillRect(x0, 0, x1 - x0, height);
                ctx.strokeRect(x0, 0, x1 - x0, height);
            }
        }
        ctx.fillStyle = cs.tracking_fill;
        ctx.strokeStyle = cs.tracking_stroke;
        if(is_tracking_range && tracking_t0 != tracking_t1) {
            var x0 = get_x(tracking_t0);
            var x1 = get_x(tracking_t1);
            ctx.fillRect(x0, 0, x1 - x0, height);
            ctx.strokeRect(x0, 0, x1 - x0, height);
        }
        if(ptx != undefined) {
            ctx.textAlign = "center";
            var tm_ptx = x_invert(ptx);
            var dstr = format_date(new Date(tm_ptx * 1000));
            var text_w = ctx.measureText(dstr).width;
            var kx = ptx;;
            if(ptx - text_w / 2 < 10) kx = 10 + text_w / 2;
            if(ptx + text_w / 2 > width - 10) kx = width - 10 - text_w / 2;
            ctx.fillStyle = cs.time_fill;
            ctx.fillText(dstr, kx, 12);
        }
        if(ptx != undefined) {
            ctx.beginPath();
            ctx.strokeStyle = cs.current_line;
            ctx.moveTo(ptx, 14);
            ctx.lineTo(ptx, height);
            ctx.stroke();
        }
    };
    var safe_redraw = function() {
        if(past_draw_pm == undefined) elem.redraw();
        else
            elem.redraw(past_draw_pm[0], past_draw_pm[1]);
    };
    elem.safe_redraw = safe_redraw;

    this.reloadData = function(data) {
        if(data != undefined) {
            if(data.start != undefined && data.end != undefined)
                elem.timeline_data = data;
            else elem.timeline_data = undefined;
        } else elem.timeline_data = undefined;
        safe_redraw();
    };
    this.setRange = function(t0, t1) {
        elem.range_t0 = t0;
        elem.range_t1 = t1;
        safe_redraw();
    };
    this.setFocusTime = function(t) {
        if(t) elem.redraw(tl_get_x(t), 0.5);
        else elem.redraw();
    };
    $(canvas).mousemove(function(e) {
        e.offsetX = e.pageX - $(canvas).offset().left;
        e.offsetY = e.pageY - $(canvas).offset().top;
        tracking_t1 = tl_get_t(e.offsetX);
        elem.redraw(e.offsetX, e.offsetY / height);
        elem.mouse_t = tl_get_t(e.offsetX);
        safe_event('onmousetchanged', undefined);
    });
    $(canvas).mouseout(function() {
        elem.redraw();
        elem.mouse_t = undefined;
        safe_event('onmousetchanged', undefined);
    });
    $(canvas).dblclick(function() {
        uniform_mag = !uniform_mag;
        safe_redraw();
    });
    $(canvas).mousedown(function(e) {
        e.offsetX = e.pageX - $(canvas).offset().left;
        e.offsetY = e.pageY - $(canvas).offset().top;
        is_tracking_range = true;
        tracking_t0 = tl_get_t(e.offsetX);
        tracking_t1 = tracking_t0;
        elem.redraw(e.offsetX, e.offsetY / height);
    });
    $(window).mouseup(function(e) {
        if(tracking_t1 < tracking_t0) {
            var t = tracking_t0;
            tracking_t0 = tracking_t1;
            tracking_t1 = t;
        }
        if(is_tracking_range) {
            if(conf.track_range) {
                if(tracking_t0 == tracking_t1) {
                    elem.range_t0 = undefined;
                    elem.range_t1 = undefined;
                } else {
                    elem.range_t0 = tracking_t0;
                    elem.range_t1 = tracking_t1;
                }
                safe_event('onrangechanged', undefined);
            }
            is_tracking_range = false;
        }
        safe_redraw();
    });

    $(window).resize(function() {
        set_width_height();
        elem.redraw();
    });

    this.timeline_export = function() {
        return canvas.toDataURL('image/png');
    };
    this.format_date = format_date;

    this.set_colorscheme = function(name) {
        cs = colorschemes[name];
        safe_redraw();
    };

    set_width_height();
    safe_redraw();
});

});

pkuvis_distribution_view = function(atoms, options) {
    if(!options) options = { };
    var width = options.width ? options.width : 100;
    var height = options.height ? options.height : 50;
    var vals = [];
    var vmin = 1e100, vmax = -1e100, vmax_p;
    for(var i in atoms) {
        var val = atoms[i];
        vals.push(val);
        if(val < vmin) vmin = val;
        if(val > vmax) vmax = val;
    }
    vals.sort();
    vmax_p = vmax;
    if(vals.length > 10) vmax_p = (vals[Math.floor(vals.length * 0.5)] - vmin) * 3 + vmin;
    var start = options.start ? options.start : vmin;
    var end = options.end ? options.end : vmax_p;

    var bins = [];
    for(var i = 0; i < width; i++) bins.push(0);
    var sigma = (end - start) / bins.length;
    for(var i in vals) {
        var val = vals[i];
        var p_center = Math.round((val - start) / (end - start) * (bins.length - 1));
        var shift = 5;
        for(var k = -shift; k <= shift; k++) {
            var ip = p_center + k;
            if(ip >= 0 && ip < bins.length) {
                var t = ip / (bins.length - 1) * (end - start) + start;
                bins[p_center + k] += Math.exp(-(t - val) * (t - val) / 2 / sigma / sigma);
            }
        }
    }
    var ymax = 0.001;
    for(var i in bins) if(bins[i] > ymax) ymax = bins[i];
    if(options.scale) ymax = options.scale;
    var canvas;
    if(options.canvas) {
        canvas = options.canvas;
        ctx = options.context;
    } else {
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
    }
    if(options.stroke_style) {
        ctx.strokeStyle = options.stroke_style;
    }
    var ypos = function(sc) {
        if(options.y_range) {
            return sc * (options.y_range[0] - options.y_range[1]) + options.y_range[1];
        } else
            return height - 2 - sc * height;
    }
    ctx.beginPath();
    ctx.moveTo(0, ypos(0));
    for(var i in bins) {
        var y = ypos(bins[i] / ymax);
        var x = i / (bins.length - 1) * width;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(width, ypos(0));
    if(options.fill_style) {
        ctx.fillStyle = options.fill_style;
        ctx.fill();
    }
    ctx.stroke();
    ctx.moveTo(0, ypos(0));
    ctx.lineTo(width, ypos(0));
    ctx.stroke();
    if(options.return_params) {
        return {
            scale: ymax,
            start: start,
            end: end
        };
    }
    if(options.return_dataurl)
        return canvas.toDataURL();
    else return canvas;
}
