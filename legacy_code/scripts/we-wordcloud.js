// Keywords

var keyword_colors = [ "255,127,14", "148,103,189", "140,86,75", "227,119,194" ];
var selected_keywords = [];

var on_keywords_changed = function() {
    for(var i in highlight_groups) {
        if(i.match(/keyword_/)) {
            delete highlight_groups[i];
        }
    }
    if(selected_keywords.length > 0) {
        if(WeiboEvents.get("node-color") != "uniform")
            WeiboEvents.set("node-color", "uniform");
    }
    for(var i in selected_keywords) {
        var word = selected_keywords[i];
        var color = keyword_colors[i % keyword_colors.length];
        var ids = [];
        highlight_groups["keyword_" + word] = {
            ids: ids,
            color: "rgba(" + color + ",1)"
        };
        for(var id in data_tree.nodes) {
            if(data_tree.nodes[id].text.indexOf(word) < 0) continue;
            ids.push(id);
        }
    }
    draw_highlight_layer();
    $("#word-cloud .word").each(function() {
        var idx;
        if((idx = selected_keywords.indexOf(this.innerHTML)) != -1) {
            $(this).css('color', 'rgb(' + keyword_colors[idx % keyword_colors.length] + ')');
            $(this).addClass('selected');
        } else {
            $(this).css('color', Colors.foreground.toRGBA());
            $(this).removeClass('selected');
        }
    });
    log_user_action("keywords", { words: selected_keywords });
}

var reset_keywords = function() {
    selected_keywords = [];
    on_keywords_changed();
}

do_select_keyword = function(word) {
    if(selected_keywords.indexOf(word) == -1) {
        selected_keywords.push(word);
    } else {
        var new_array = [];
        for(var i in selected_keywords) {
            if(selected_keywords[i] != word) new_array.push(selected_keywords[i]);
        }
        selected_keywords = new_array;
    }
    on_keywords_changed();
}

var update_wordcloud = function(ids) {
    var words_index = {};
    selected_keywords = [];
    on_keywords_changed();
    if(ids == undefined) {
        for(var i in data_tree.nodes) {
            var a = data_tree.nodes[i];
            var words = a.words ? a.words.split(",") : [];
            for(var i in words) {
                if(words[i] == "" || words[i].length < 2) continue;
                if(words_index[words[i]] == undefined) words_index[words[i]] = [];
                words_index[words[i]].push(a.id);
            }
        }
    } else {
        for(var index in ids) {
            var a = data_tree.nodes[ids[index]];
            var words = a.words ? a.words.split(",") : [];
            for(var i in words) {
                if(words[i] == "" || words[i].length < 2) continue;
                if(words_index[words[i]] == undefined) words_index[words[i]] = [];
                words_index[words[i]].push(a.id);
            }
        }
        /*
        var for_children = function(pid) {
            var node = data_tree.nodes[pid];
            var words = node.words ? node.words.split(",") : [];
            for(var i in words) {
                if(words[i] == "" || words[i].length < 2) continue;
                if(words_index[words[i]] == undefined) words_index[words[i]] = [];
                words_index[words[i]].push(node.id);
            }
            for(var i in data_tree.nodes[pid].children) {
                var nid = data_tree.nodes[pid].children[i];
                for_children(nid);
            }
        }
        for_children(partial_tree_root);
        */
    }
    var words_sorted = [];
    for(var w in words_index) words_sorted.push(w);
    words_sorted.sort(function(a, b) {
        return words_index[b].length - words_index[a].length;
    });
    // Create word cloud.
    if(words_sorted.length > 0) {
        var ht = "";
        var max_num = words_index[words_sorted[0]].length;
        var min_num = words_index[words_sorted[words_sorted.length >= 20 ? 19 : words_sorted.length - 1]].length;
        for(var i in words_sorted) {
            if(i >= 20) break;
            var num = words_index[words_sorted[i]].length;
            var sz = Math.sqrt((num - min_num) / (max_num - min_num)) * 12 + 12;
            ht += '<span class="word" style="font-size:'+sz+'px" onclick="do_select_keyword(this.innerHTML)">' + words_sorted[i] + '</span>';
        }
        $("#word-cloud-words").html(ht);
    } else $("#word-cloud-words").html('');
}
$("#word-cloud .cancel").click(function() {
    selected_keywords = [];
    on_keywords_changed();
});
var keywords_my = [];
$("#input-keyword-selection").keydown(function(e) {
    if(e.keyCode == 13 && this.value != "") {
        if(keywords_my.indexOf(this.value) == -1) {
            keywords_my.push(this.value);
            $("#word-cloud-mywords").append('<span class="word" style="font-size: 12px" onclick="do_select_keyword(this.innerHTML)">' + this.value + '</span>');
        }
        do_select_keyword(this.value);
        this.value = "";
    }
    e.stopPropagation();
});

var on_load_keywords = function(ids, emotions, words) {
    for(var i in ids) {
        var id = ids[i];
        data_tree.nodes[id].emotion = emotions[i];
        data_tree.nodes[id].words = words[i].split(" ").map(function(t) {
            var pos = t.lastIndexOf("/");
            return t.substr(0, pos);
        }).join(",");
    }
    update_wordcloud();
    //set_emotion_color();
};

update_wordcloud();

// Request for keywords.
(function() {
    var texts = [];
    var ids = [];
    texts = atoms.map(function(x) { return x.text; });
    ids = atoms.map(function(x) { return x.id; });
    // $.ajax({
    //     url: WeiboEvents.backend_server_prefix + "/weibova/wordsplit/",
    //     type: 'post',
    //     data: {
    //         texts: JSON.stringify(texts)
    //     },
    //     dataType: "json",
    //     crossDomain: true,
    //     timeout: 60000
    // }).done(function(data) {
    //     on_load_keywords(ids, data.words.map(function() { return 0; }), data.words);
    // }).fail(function() {
    // });
})();
