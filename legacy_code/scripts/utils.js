{{include: wutils.js}}

WeiboEvents.api_key = "DISABLED";
WeiboEvents.access_token = "disabled";
WeiboEvents.uid = "disabled";

WeiboEvents.backend_server_prefix = "disabled";

get_query = function(name, search) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)')
             .exec(search ? search : location.search)||[,""])[1]
             .replace(/\+/g, '%20'))||null;
};

decode_query = function(search) {
    if(!search) search = location.search;
    if(search[0] == '#' || search[0] == '?') {
        search = search.substr(1);
    }
    var pairs = search.split("&");
    var params = { };
    pairs.forEach(function(p) {
        var t = p.split("=");
        if(t.length == 1) params[t[0]] = true;
        else {
            params[t[0]] = decodeURIComponent(t[1]);
        }
    });
    return params;
};

build_query = function(data) {
   var ret = [];
   for (var d in data)
      ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
   return ret.join("&");
};

(function() {
    // Calculate SHA1 of the bytes array.
    // Convert UTF-8 string to bytes array.
    function sha1_str2bytes(str) {
        var bytes = [];
        for (var i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) <= 0x7F)
                bytes.push(str.charCodeAt(i));
            else {
                var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
                for(var j = 0; j < h.length; j++)
                    bytes.push(parseInt(h[j], 16));
            }
        }
        return bytes;
    }
    // Convert UTF-8 bytes array back to string.
    function sha1_bytes2str(bytes) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
        while(i < bytes.length) {
            c = bytes[i];
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224) && i + 1 < bytes.length) {
                c2 = bytes[i + 1];
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else if(i + 2 <= bytes.length) {
                c2 = bytes[i + 1];
                c3 = bytes[i + 2];
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    }
    // Convert a hex string to bytes array.
    function sha1_hex2bytes(hexstr) {
        var bytes = [];
        var trans = function(c) {
            if(c <= 0x39 && c >= 0x30) return c - 0x30;
            if(c <= 0x66 && c >= 0x61) return c - 0x61 + 10;
            if(c <= 0x46 && c >= 0x41) return c - 0x41 + 10;
            return 0;
        }
        for(var i = 0; i < hexstr.length; i += 2) {
            bytes.push(trans(hexstr.charCodeAt(i)) << 4 | trans(hexstr.charCodeAt(i + 1)));
        }
        return bytes;
    }
    // Convert bytes array to hex string.
    function sha1_bytes2hex(bytes) {
        var str = "";
        var hex_digits = "0123456789abcdef";
        for(var i = 0; i < bytes.length; i++) {
            str += hex_digits[bytes[i] >> 4];
            str += hex_digits[bytes[i] % 16];
            //str += "("+bytes[i] + ")";
        }
        return str;
    }
    function sha1_hash(data) {
        var sha1_add = function(x, y) {
            var lb = (x & 0xFFFF) + (y & 0xFFFF);
            var hb = (x >> 16) + (y >> 16) + (lb >> 16);
            return (hb << 16) | (lb & 0xFFFF);
        };
        var sha1_S = function(n, x) {
            return (x << n) | (x >>> (32 - n));
        };
        var sha1_const_K = function(t) {
            if(t < 20) return 0x5A827999;
            if(t < 40) return 0x6ED9EBA1;
            if(t < 60) return 0x8F1BBCDC;
            return 0xCA62C1D6;
        };
        var sha1_func = function(t, B, C, D) {
            if(t < 20) return (B & C) | ((~B) & D);
            if(t < 40) return B ^ C ^ D;
            if(t < 60) return (B & C) | (B & D) | (C & D);
            return B ^ C ^ D;
        };
        var sha1_append = function(bytes) {
            var len = 8 * bytes.length;
            bytes.push(128);
            var n_append = 56 - bytes.length % 64;
            if(n_append < 0) n_append += 64;
            for(var i = 0; i < n_append; i++) bytes.push(0);
            bytes.push(0); bytes.push(0); bytes.push(0); bytes.push(0);
            bytes.push((len >> 24) & 0xFF);
            bytes.push((len >> 16) & 0xFF);
            bytes.push((len >> 8) & 0xFF);
            bytes.push(len & 0xFF);
            return bytes;
        };
        bytes = sha1_append(data);
        words = [];
        for(var i = 0; i < bytes.length; i += 4) {
            var w = bytes[i] << 24 | bytes[i + 1] << 16 | bytes[i + 2] << 8 | bytes[i + 3];
            words.push(w);
        }
        H = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
        for(var i = 0; i < words.length; i += 16) {
            W = [];
            for(var t = 0; t < 16; t++) W[t] = words[i + t];
            for(var t = 16; t < 80; t++)
                W[t] = sha1_S(1, W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16]);
            A = H[0]; B = H[1]; C = H[2]; D = H[3]; E = H[4];
            for(var t = 0; t < 80; t++) {
                tmp = sha1_add(sha1_S(5, A), sha1_add(sha1_add(sha1_add(sha1_func(t, B, C, D), E), W[t]), sha1_const_K(t)));
                E = D; D = C; C = sha1_S(30, B); B = A; A = tmp;
            }
            H[0] = sha1_add(H[0], A);
            H[1] = sha1_add(H[1], B);
            H[2] = sha1_add(H[2], C);
            H[3] = sha1_add(H[3], D);
            H[4] = sha1_add(H[4], E);
        }
        var rslt = [];
        for(var i = 0; i < 5; i++) {
            rslt.push((H[i] >> 24) & 0xFF);
            rslt.push((H[i] >> 16) & 0xFF);
            rslt.push((H[i] >> 8) & 0xFF);
            rslt.push(H[i] & 0xFF);
        }
        return rslt;
    }
    sha1_str = function(s) {
        return sha1_bytes2hex(sha1_hash(sha1_str2bytes(s)));
    }
})();


$(document).ready(function() {
    $(".pkuvis-slider").each(function() {
        var elem = this;
        elem.slider_value = 0;
        var width = parseInt($(elem).css('width').replace('px',''));
        $(elem).addClass("slider");
        $(elem).append($("<div />"));
        var div = $(elem).children('div');
        div.css('cursor', 'pointer');

        var is_dragging = false;
        var x0 = 0, tx0 = 0;

        var onchange = function(x) {
            var t = x / (width - 16);
            elem.slider_value = t;
            if(elem.onvaluechanged != undefined) {

                elem.onvaluechanged(t);
            }
        };
        var onchange_up = function() {
            if(elem.onvaluechanged_up != undefined) {
                elem.onvaluechanged_up(elem.slider_value);
            }
        };

        elem.slider_set = function(t) {
            var x = t * (width - 16);
            div.css('left', x + "px");
        }
        if(elem.getAttribute('class').match(/pkuvis-slider-center/) != undefined) elem.slider_set(0.5);


        div.mousedown(function(e) {
            is_dragging = true;
            x0 = e.pageX;
            tx0 = parseInt(div.css('left').replace('px',''));
        });
        $(elem).mousedown(function(e) {
            var xx = e.pageX - $(elem).offset().left - 8;
            if(xx < 0) xx = 0;
            if(xx > width - 16) xx = width - 16;
            onchange(xx);
            div.css('left', xx + "px");
            is_dragging = true;
        });
        $(window).mousemove(function(e) {
            if(is_dragging) {
                var xx = tx0 + e.pageX - x0;
                if(xx < 0) xx = 0;
                if(xx > width - 16) xx = width - 16;
                onchange(xx);
                div.css('left',xx + "px");
            }
        });

        $(window).mouseup(function() {
            if(is_dragging) {
                is_dragging = false;
                onchange_up();
            }
        })
    });
});

function Weibo_str62to10(str62) {
    var str62keys = [
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
    ];
    var i10 = 0;
    for(var i = 0; i < str62.length; i++) {
        var n = str62.length - i - 1;
        var s = str62[i];
        i10 += str62keys.indexOf(s) * Math.pow(62, n);
    }
    return i10;
};
function Weibo_int10to62(int10) {
    var str62keys = [
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
    ];
	var s62 = '';
	var r = 0;
	while(int10 != 0) {
		r = int10 % 62;
		s62 = str62keys[r] + s62;
		int10 = Math.floor(int10 / 62);
	}
	return s62;
};
function Weibo_url2mid(url) {
    var mid = '';
    for (var i = url.length - 4; i > -4; i -= 4) {
        var offset1 = i < 0 ? 0 : i;
        var offset2 = i + 4;
        var str = url.substring(offset1, offset2);
        str = Weibo_str62to10(str).toString();
        if(offset1 > 0)
            while(str.length < 7) str = '0' + str;
        mid = str + mid;
    }
    return mid;
};

function Weibo_miduid2url(mid, uid) {
	var url = '';
	for(var i = mid.length - 7; i > -7; i = i - 7) {
		var offset1 = i < 0 ? 0 : i;
		var offset2 = i + 7;
		var num = mid.substring(offset1, offset2);
		num = Weibo_int10to62(num);
		url = num + url;
	}
	return "http://weibo.com/" + uid + "/" + url;
};

WeiboEvents.getMidFromURL = function(url) {
    var mid = '';
    for (var i = url.length - 4; i > -4; i -= 4) {
        var offset1 = i < 0 ? 0 : i;
        var offset2 = i + 4;
        var str = url.substring(offset1, offset2);
        str = Weibo_str62to10(str).toString();
        if(offset1 > 0)
            while(str.length < 7) str = '0' + str;
        mid = str + mid;
    }
    return mid;
};
WeiboEvents.getURLFromMidUid = function(mid, uid) {
    var url = '';
    for(var i = mid.length - 7; i > -7; i = i - 7) {
        var offset1 = i < 0 ? 0 : i;
        var offset2 = i + 7;
        var num = mid.substring(offset1, offset2);
        num = Weibo_int10to62(num);
        url = num + url;
    }
    return "http://weibo.com/" + uid + "/" + url;
};
WeiboEvents.parseWeiboURL = function(url) {
    var m;
    if(m = url.match(/^http\:\/\/(www\.|e.)?weibo\.com\/([0-9a-zA-Z\.\-\_]+)\/([0-9a-zA-Z\.\-\_]+)/)) {
        var uid = m[2];
        var mid = WeiboEvents.getMidFromURL(m[3]);
        return { uid: uid, mid: mid };
    }
    return;
};

var pkuvis_rating_initialize = function(elem, sty) {
    var style = sty;
    if(style == undefined) style = "degree";
    var sel = $(elem);
    sel.append('<span class="rating-1"></span>');
    sel.append('<span class="rating-2"></span>');
    sel.append('<span class="rating-3"></span>');
    sel.append('<span class="rating-4"></span>');
    sel.append('<span class="rating-5"></span>');
    var spans = sel.children('span');
    for(var i = 0; i < 5; i++) {
        spans[i]._val = i + 1;
    }
    elem.rating_value = 3;
    var update = function(r) {
        for(var i = 0; i < 5; i++) {
            if(style == "degree") {
                spans[i].innerHTML = i < r ? '★' : '☆';
            } else {
                spans[i].innerHTML = i == r - 1 ? '★' : '☆';
            }
        }
    }
    update(elem.rating_value);
    sel.children('span').mouseover(function() {
        var rating = this._val;
        update(rating);
    });
    sel.children('span').mouseout(function() {
        update(elem.rating_value);
    });
    sel.children('span').click(function() {
        var rating = this._val;
        elem.rating_value = rating;
        update(rating);
        if(elem.onratingchanged != null) {
            elem.onratingchanged(rating);
        }
    });
    elem.rating_set = function(val) {
        if(val == undefined) return;
        elem.rating_value = val;
        update(val);
    }
    return elem;
}

var pkuvis_rating_text = function(r, style) {
    var s = "";
    if(style == undefined) style = "degree";
    for(var i = 0; i < 5; i++) {
        if(style == "degree") {
            s += i < r ? '★' : '☆';
        } else {
            s += i == r - 1 ? '★' : '☆';
        }
    }
    return s;
}

$(".pkuvis-rating").each(function() {
    pkuvis_rating_initialize(this);
});

var measureTextBlock = function(ctx, text, max_w) {
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
};

var WBSTK = {};

// jquery - fadeToggle
jQuery.fn.fadeToggle = function(speed, easing, callback) {
    return this.animate({opacity: 'toggle'}, speed, easing, callback);
};

// ### ScrollView
// Scrollable view, automatically handle content and window resize.

$.fn.ScrollView = function() {
    var container = this;
    var $this = this;
    var data = $this.data();

    if(!data.is_created) {
        data.is_created = true;

        var view = container.children("div:first");
        view.addClass("scrollview-content");
        var scrollbar = $("<div />").addClass("scrollbar");
        var guide = $("<div />").addClass("guide");
        scrollbar.append(guide);
        container.append(scrollbar);

        var get_top = function() {
            var top = view.css("top");
            if(!top) top = 0;
            else top = parseFloat(top.replace("px", ""));
            if(isNaN(top)) top = 0;
            return top;
        };
        var set_top = function(top) {
            var view_h = view.outerHeight();
            var cont_h = container.height();
            container.removeClass("no-mark-top").removeClass("no-mark-bottom");
            if(view_h < cont_h || view_h == 0) {
                top = 0;
                scrollbar.addClass("hide");
                container.addClass("no-mark-top").addClass("no-mark-bottom");
            } else {
                if(top > 0) top = 0;
                if(top < cont_h - view_h) top = cont_h - view_h;
                if(top == 0) {
                    container.addClass("no-mark-top");
                }
                if(top == cont_h - view_h) {
                    container.addClass("no-mark-bottom");
                }
                scrollbar.removeClass("hide");
                guide.css({
                    height: (cont_h / view_h * cont_h) + "px",
                    top: (-top / view_h * cont_h) + "px"
                });
            }
            view.css("top", top + "px");
        };
        container.mousewheel(function(e, delta, deltaX, deltaY) {
            var t0 = get_top();
            set_top(get_top() + deltaY * 40);
            var t1 = get_top();
            if(t0 != t1)
                e.stopPropagation();
        });

        var check_size = function() {
            set_top(get_top());
        };
        data.check_size_timer = setInterval(check_size, 200);

        WeiboEvents.trackMouseEvents(guide, {
            down: function(e) {
                this.top0 = parseFloat(guide.css("top").replace("px", ""));
                this.mouse0 = e.pageY;
                e.preventDefault();
                scrollbar.addClass("dragging");
            },
            move: function(e) {
                var new_top = this.top0 + e.pageY - this.mouse0;
                var view_h = view.outerHeight();
                var cont_h = container.height();
                var rtop = -new_top * view_h / cont_h;
                set_top(rtop);
            },
            up: function() {
                scrollbar.removeClass("dragging");
            }
        });
    }
};

