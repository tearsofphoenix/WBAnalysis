// This file is for inline use in weiboevents.js.
// Defines some useful functions.

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
            r[j] += kernel(get_t(j) - t, i);
        }
    }
    return r;
};

var linear_resample = function(array, n) {
    var r = [];
    for(var i = 0; i < n; i++) {
        var t = i / (n - 1) * (array.length - 1);
        var idx = Math.floor(t);
        if(idx == array.length - 1) r.push(array[array.length - 1]);
        else {
            var a = t - idx;
            r.push(array[idx] * (1 - a) + array[idx + 1] * a);
        }
    }
    return r;
};

var lap_smooth = function(array, a) {
    var tmp = [];
    for(var i = 0; i < array.length; i++) {
        var v;
        if(i == 0 || i == array.length - 1) v = array[i];
        else v = array[i]*(1-a) + (array[i-1]+array[i+1])/2*a;
        tmp.push(v);
    }
    return tmp;
};
