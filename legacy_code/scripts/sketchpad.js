// sketchpad.js
// Sketchpad with jQuery and canvas.

var pkuvis_sketchpad_initialize;
(function(){
    pkuvis_sketchpad_initialize = function(elem, options) {
        if(!elem) return;
        if(!options) options = {};
        var canvas = document.createElement('canvas');

        var set_width_height = function() {
            var g = canvas.getContext("2d");
            var dev_ratio = window.devicePixelRatio || 1;
            var backing_ratio = g.webkitBackingStorePixelRatio ||
                                g.mozBackingStorePixelRatio ||
                                g.msBackingStorePixelRatio ||
                                g.oBackingStorePixelRatio ||
                                g.backingStorePixelRatio || 1;
            var ratio = dev_ratio / backing_ratio;
            canvas._width = options.width ? options.width : $(elem).width();
            canvas._height = options.height ? options.height : $(elem).height();
            canvas.width = canvas._width * ratio;
            canvas.height = canvas._height * ratio;
            $(canvas).css("width", canvas._width + "px");
            $(canvas).css("height", canvas._height + "px");
            g.setTransform(ratio, 0, 0, ratio, 0, 0);
        };
        set_width_height();

        var ctx = canvas.getContext('2d');

        var toolbox = document.createElement('div');
        toolbox.setAttribute('class', 'toolbox');
        toolbox.innerHTML =
            ' <span class="button btn-arrow">箭头</span>' +
            ' <span class="button btn-rect">矩形</span>' +
            ' <span class="button btn-text">文本</span>' +
            ' <span class="btn-color btn-color-100-100-100"></span>' +
            ' <span class="btn-color btn-color-31-119-180"></span>' +
            ' <span class="btn-color btn-color-255-127-14"></span>' +
            ' <span class="btn-color btn-color-44-160-44"></span>' +
            ' <span class="button btn-remove">删除</span>' +
            ' <span class="button btn-close">关闭</span>';
        elem.appendChild(canvas);
        var text_input = $("<input />").addClass("text-input")
            .css({
                "font-size": "24px",
                "font-family": "Helvetica"
            });
        $(elem).append(text_input);
        elem.appendChild(toolbox);
        elem.sketchpad_redraw = redraw;
        elem.sketchpad_enabled = true;

        elem.sketchpad_canvas = canvas;

        var elements = [];

        var BBox_is_in = function(bbox, x, y) {
            if(bbox.inactive) return false;
            if(bbox.w) {
                return x >= bbox.x && y >= bbox.y && x <= bbox.x + bbox.w && y <= bbox.y + bbox.h;
            } else if(bbox.r !== undefined) {
                var d = (x - bbox.x) * (x - bbox.x) + (y - bbox.y) * (y - bbox.y);
                return bbox.r * bbox.r >= d;
            } else if(bbox.theta !== undefined) {
                var xx = x - bbox.x;
                var yy = y - bbox.y;
                var _x =  xx * Math.cos(bbox.theta) + yy * Math.sin(bbox.theta);
                var _y = -xx * Math.sin(bbox.theta) + yy * Math.cos(bbox.theta);
                return Math.abs(_x) <= bbox.rx && Math.abs(_y) <= bbox.ry;
            }
        };

        var get_bboxs = function(e) { // { x, y, w, h, angle }
            var rslt = [];
            if(e.type == "text") {
                ctx.font = e.font.size + "px " + e.font.family;
                var w = ctx.measureText(e.text).width;
                var h = e.font.size;
                var x = e.x - 5;
                var y = e.y - h - 3;
                h += 10;
                w += 10;
                rslt.push({ x : x, y : y, w : w, h : h });
            }
            if(e.type == "arrow") {
                rslt.push({ x : e.x1, y : e.y1, r : 10 });
                rslt.push({ x : e.x2, y : e.y2, r : 10 });
                var dx = e.x2 - e.x1, dy = e.y2 - e.y1;
                var cx = (e.x1 + e.x2) / 2;
                var cy = (e.y1 + e.y2) / 2;
                var theta = Math.atan2(dy, dx);
                rslt.push({ x: cx, y: cy, rx: Math.sqrt(dx * dx + dy * dy) / 2, ry: 5, theta: theta });
            }
            if(e.type == "rect") {
                rslt.push({ invisible: true, x: e.x1, y: e.y1, r: 10 });
                rslt.push({ invisible: true, x: e.x2, y: e.y2, r: 10 });
                rslt.push({ invisible: true, x: e.x2, y: e.y1, r: 10 });
                rslt.push({ invisible: true, x: e.x1, y: e.y2, r: 10 });
                rslt.push({ invisible: true, x: e.x1, y: (e.y1 + e.y2) / 2, rx: 10, ry: Math.abs(e.y2 - e.y1) / 2, theta: 0 });
                rslt.push({ invisible: true, x: e.x2, y: (e.y1 + e.y2) / 2, rx: 10, ry: Math.abs(e.y2 - e.y1) / 2, theta: 0 });
                rslt.push({ invisible: true, x: (e.x1 + e.x2) / 2, y: e.y1, rx: Math.abs(e.x2 - e.x1) / 2, ry: 10, theta: 0 });
                rslt.push({ invisible: true, x: (e.x1 + e.x2) / 2, y: e.y2, rx: Math.abs(e.x2 - e.x1) / 2, ry: 10, theta: 0 });
                rslt.push({ x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2,
                            rx: Math.abs(e.x2 - e.x1) / 2 + 5,
                            ry: Math.abs(e.y2 - e.y1) / 2 + 5,
                            theta: 0, inactive: true });
            }
            return rslt;
        };

        var cleanup_empty = function() {
            var nels = [];
            for(var i in elements) {
                if(elements[i].type == "text" && elements[i].text == "") continue;
                nels.push(elements[i]);
            }
            elements = nels;
        };

        var redraw = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for(var i in elements) {
                var e = elements[i];
                ctx.save();
                if(e.type == "arrow") {

                    if(e.style) ctx.fillStyle = ctx.strokeStyle = e.style;
                    if(e.width) ctx.lineWidth = e.width;
                    var dx = e.x2 - e.x1, dy = e.y2 - e.y1;
                    var angle = Math.atan2(-dy, -dx);
                    var len = Math.sqrt(dx * dx + dy * dy);
                    if(len >= 10) {
                        var theta = 15 / 180.0 * Math.PI;
                        var l = len / 8, tx, ty;
                        if(l < 20) l = 20;
                        if(l > 40) l = 40;
                        var wx = e.x2 + l * Math.cos(angle) * 0.7;
                        var wy = e.y2 + l * Math.sin(angle) * 0.7;
                        tx = e.x2 + l * Math.cos(angle + theta);
                        ty = e.y2 + l * Math.sin(angle + theta);
                        ctx.beginPath();
                        ctx.moveTo(e.x1, e.y1);
                        ctx.lineTo(wx, wy);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(wx, wy);
                        ctx.lineTo(tx, ty);
                        ctx.lineTo(e.x2, e.y2);
                        tx = e.x2 + l * Math.cos(angle - theta);
                        ty = e.y2 + l * Math.sin(angle - theta);
                        ctx.lineTo(tx, ty);
                        ctx.lineTo(wx, wy);
                        ctx.fill();
                    } else {
                        ctx.beginPath();
                        ctx.moveTo(e.x1, e.y1);
                        ctx.lineTo(e.x2, e.y2);
                        ctx.stroke();
                    }
                }
                if(e.type == "text") {
                    ctx.beginPath();
                    if(e.style) ctx.fillStyle = e.style;
                    ctx.font = e.font.size + "px " + e.font.family;
                    ctx.fillText(e.text, e.x, e.y);
                }
                if(e.type == "rect") {
                    if(e.style) ctx.strokeStyle = e.style;
                    if(e.width) ctx.lineWidth = e.width;
                    ctx.strokeRect(Math.min(e.x1, e.x2),
                                   Math.min(e.y1, e.y2),
                                   Math.abs(e.x2 - e.x1),
                                   Math.abs(e.y2 - e.y1));
                }
                if(current_object == e && e.type != "text") {
                    var bboxs = get_bboxs(e);
                    ctx.strokeStyle = "gray";
                    ctx.lineWidth = 1;
                    for(var i in bboxs) {
                        var bbox = bboxs[i];
                        if(bbox.invisible) continue;
                        if(bbox.theta !== undefined) {
                            ctx.save();
                            ctx.translate(bbox.x, bbox.y);
                            ctx.rotate(bbox.theta);
                            ctx.strokeRect(-bbox.rx, -bbox.ry, bbox.rx * 2, bbox.ry * 2);
                            ctx.restore();
                        } else if(bbox.w !== undefined) {
                            ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);
                        } else {
                            ctx.arc(bbox.x, bbox.y, bbox.r, 0, Math.PI * 2);
                        }
                    }
                }
                ctx.restore();
            }
            if(elem.custom_draw) elem.custom_draw(ctx);
        };

        var dragging_element = null;
        var current_object = null;
        var clx_down, cly_down;

        var creating_type = null;
        var creating_text = "";

        $(text_input).bind("change keyup", function() {
            var text = $(text_input).val();
            var ctx = canvas.getContext("2d");
            ctx.font = "24px Helvetica";
            var w = canvas.getContext("2d").measureText(text).width;
            $(text_input).css("width", w + 50 + "px");
            if($(text_input).data().obj) {
                $(text_input).data().obj.text = text;
                redraw();
            }
        });
        $(text_input).mousedown(function(e) {
            e.stopPropagation();
        });
        $(text_input).data().update = function(current_object) {
            if(current_object) {
                $(text_input).val(current_object.text);
                $(text_input).css({
                    left: current_object.x - 4 + "px",
                    top: current_object.y - current_object.font.size + "px",
                    "font-family": current_object.font.family,
                    "font-size": current_object.font.size + "px",
                    "color": current_object.style
                }).show().data().font = current_object.font;
                $(text_input).change();
                $(text_input).data().obj = current_object;
            } else {
                $(text_input).hide();
                $(text_input).data().obj = null;
            }
        };

        $(canvas).mousedown(function(event) {
            var clX = event.pageX - $(elem).offset().left;
            var clY = event.pageY - $(elem).offset().top;
            clx_down = clX;
            cly_down = clY;
            if(!elem.sketchpad_enabled) return true;
            if(creating_type) {
                var e = {};
                if(creating_type == "arrow") {
                    e = { type: "arrow", x1: clX, y1: clY, x2: clX + 1, y2: clY + 1, width: 2 };
                    e.select_index = 1;
                }
                if(creating_type == "rect") {
                    e = { type: "rect", x1: clX, y1: clY, x2: clX + 1, y2: clY + 1, width: 2 };
                    e.select_index = 1;
                }
                if(creating_type == "text") {
                    e = { type: "text", x: clX, y: clY, font: { family: "Helvetica", size: 24 },
                          text: creating_text
                        };
                    e.select_index = 0;
                }
                current_object = e;
                current_object.selected = true;
                current_object.style = "rgb(255,127,14)";
                dragging_element = e;
                e.prev_object = $.parseJSON(JSON.stringify(e));
                elements.push(e);
                $(toolbox).children(".btn-" + creating_type).removeClass("active");
                creating_type = undefined;
            } else {
                current_object = null;
                for(var i in elements) {
                    var e = elements[i];
                    e.selected = false;
                    var bboxs = get_bboxs(e);
                    for(var k in bboxs) {
                        var bbox = bboxs[k];
                        if(BBox_is_in(bbox, clX, clY)) {
                            current_object = e;
                            current_object.select_index = k;
                            break;
                        }
                    }
                    if(current_object) break;
                }
                if(current_object)
                    current_object.selected = true;
                dragging_element = current_object;
                if(dragging_element) {
                    var e = dragging_element;
                    if(e.prev_object) delete e.prev_object;
                    e.prev_object = $.parseJSON(JSON.stringify(e));
                }
            }
            redraw();
            $(text_input).data().update(null);
            if(dragging_element)
                event.stopPropagation();
        });
        $(window).mousemove(function(e) {
            var clX = e.pageX - $(elem).offset().left;
            var clY = e.pageY - $(elem).offset().top;
            if(dragging_element) {
                var e = dragging_element;
                if(e.type == "text") {
                    e.x = e.prev_object.x + clX - clx_down;
                    e.y = e.prev_object.y + clY - cly_down;
                }
                if(e.type == "arrow") {
                    if(e.select_index == 0) {
                        e.x1 = e.prev_object.x1 + clX - clx_down;
                        e.y1 = e.prev_object.y1 + clY - cly_down;
                    } else if(e.select_index == 1) {
                        e.x2 = e.prev_object.x2 + clX - clx_down;
                        e.y2 = e.prev_object.y2 + clY - cly_down;
                    } else {
                        e.x1 = e.prev_object.x1 + clX - clx_down;
                        e.y1 = e.prev_object.y1 + clY - cly_down;
                        e.x2 = e.prev_object.x2 + clX - clx_down;
                        e.y2 = e.prev_object.y2 + clY - cly_down;
                    }
                }
                if(e.type == "rect") {
                    if(e.select_index == 0) {
                        e.x1 = e.prev_object.x1 + clX - clx_down;
                        e.y1 = e.prev_object.y1 + clY - cly_down;
                    } else if(e.select_index == 1) {
                        e.x2 = e.prev_object.x2 + clX - clx_down;
                        e.y2 = e.prev_object.y2 + clY - cly_down;
                    } else if(e.select_index == 3) {
                        e.x1 = e.prev_object.x1 + clX - clx_down;
                        e.y2 = e.prev_object.y2 + clY - cly_down;
                    } else if(e.select_index == 2) {
                        e.x2 = e.prev_object.x2 + clX - clx_down;
                        e.y1 = e.prev_object.y1 + clY - cly_down;
                    } else {
                        e.x1 = e.prev_object.x1 + clX - clx_down;
                        e.y1 = e.prev_object.y1 + clY - cly_down;
                        e.x2 = e.prev_object.x2 + clX - clx_down;
                        e.y2 = e.prev_object.y2 + clY - cly_down;
                    }
                }
                redraw();
            }
        });
        $(window).mouseup(function() {
            if(dragging_element && dragging_element.type == "text") {
                $(text_input).data().update(dragging_element);
            } else if(dragging_element) {
                $(text_input).data().update(null);
            }
            dragging_element = null;
            cleanup_empty();
        });
        $(toolbox).children(".btn-arrow").click(function() {
            creating_type = "arrow";
            $(this).addClass("active");
        });
        $(toolbox).children(".btn-rect").click(function() {
            creating_type = "rect";
            $(this).addClass("active");
        });
        $(toolbox).children(".btn-text").click(function() {
            creating_text = "text";
            if(creating_text != "")
                creating_type = "text";
            $(this).addClass("active");
        });
        $(toolbox).children(".btn-color").each(function() {
            var cls = $(this).attr('class');
            var m = cls.match(/btn-color-(\d+)-(\d+)-(\d+)/);
            var color = 'rgb(' + m[1] + ',' + m[2] + ',' + m[3] + ')';
            $(this).css('color', color);
            $(this).css('background-color', color);
        });
        $(toolbox).children(".btn-color").click(function() {
            var cls = $(this).attr('class');
            var m = cls.match(/btn-color-(\d+)-(\d+)-(\d+)/);
            var color = 'rgb(' + m[1] + ',' + m[2] + ',' + m[3] + ')';
            if(current_object) {
                current_object.style = color;
                if(current_object == $(text_input).data().obj) {
                    $(text_input).data().update(current_object);
                }
                redraw();
            }
        });
        $(toolbox).children(".btn-remove").click(function() {
            if(current_object) {
                var new_elements = [];
                for(var i in elements) if(elements[i] != current_object) new_elements.push(elements[i]);
                elements = new_elements;
                redraw();
                if(current_object == $(text_input).data().obj) {
                    $(text_input).data().update(null);
                }
                current_object = null;
            }
        });
        $(toolbox).children(".btn-close").click(function() {
            if(elem.on_sketchpad_close) elem.on_sketchpad_close();
        });

        $(toolbox).mousedown(function(e) { e.stopPropagation(); });

        if(options.disable) elem.sketchpad_enabled = false;

        var props = [ "x.posx", "x1.posx", "x2.posx", "y.posy", "y1.posy", "y2.posy", "text", "style", "font", "width" ];
        elem.sketchpad_export = function() {
            var r = [];
            for(var eidx in elements) {
                var e = elements[eidx];
                var o = {
                    type: e.type,
                };
                for(var i in props) {
                    var pname = props[i];
                    var m = pname.match(/([^\.]+)(\.(.*))?/);
                    if(e[m[1]]) {
                        var val = e[m[1]];
                        if(m[3] == 'posx') val = val;
                        if(m[3] == 'posy') val = val;
                        o[m[1]] = val;
                    }
                }
                r.push(o);
            }
            return { elements: r, canvas_size: [ canvas._width, canvas._height ] };
        };

        elem.sketchpad_import = function(data) {
            elements = [];
            for(var i in data.elements) {
                var o = data.elements[i];
                var e = { type: o.type };
                for(var i in props) {
                    var pname = props[i];
                    var m = pname.match(/([^\.]+)(\.(.*))?/);
                    if(o[m[1]]) {
                        var val = o[m[1]];
                        if(m[3] == 'posx') val = (val - data.canvas_size[0] / 2) * canvas._height /  data.canvas_size[1] + canvas._width / 2;
                        if(m[3] == 'posy') val = (val - data.canvas_size[1] / 2) * canvas._height /  data.canvas_size[1] + canvas._height / 2;
                        e[m[1]] = val;
                    }
                }
                elements.push(e);
            }
            redraw();
        };

        elem.redraw = redraw;

        elem.deselect = function() {
            current_object = null;
            $(text_input).data().update(null);
            redraw();
        };

        elem.update_size = function() {
            set_width_height();
            redraw();
        };

        redraw();
    };
})();
