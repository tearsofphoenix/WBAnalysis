function create_pagination(info) {
    var get = info.get;
    var render = info.render;
    var r = $("<div />");
    var target = $("<div >");
    var pagination_container = $("<ul />").addClass("pagination");
    r.append(pagination_container).append(target);
    var load_page = function(page_index) {
        get(page_index, function(data) {
            // Remove previous content.
            pagination_container.children().remove();
            target.children().remove();
            // Page count.
            var page_count = data.page_count;
            // Render content.
            render(data, target);
            // Generate pagination.
            var li_prev = $("<li />").append($("<a />").attr("href", "#").html('&laquo;'));
            pagination_container.append(li_prev);
            if(page_index == 1) li_prev.addClass("disabled");
            else {
                li_prev.click(function(e) {
                    load_page(page_index - 1);
                    e.preventDefault();
                });
            }
            for(var i = 1; i <= page_count; i++) {
                if(Math.abs(page_index - i) >= 4 && i >= 3 && i <= page_count - 3) {
                    if(i == page_index - 4) {
                        var a = $("<a />").attr("href", "#").text("...");
                        var li = $("<li />").append(a);
                        pagination_container.append(li);
                    }
                    if(i == page_index + 4) {
                        var a = $("<a />").attr("href", "#").text("...");
                        var li = $("<li />").append(a);
                        pagination_container.append(li);
                    }
                    continue;
                }
                var a = $("<a />").attr("href", "#").text(i);
                var li = $("<li />").append(a)
                pagination_container.append(li);
                if(i == page_index) li.addClass("active");
                else {
                    a.data().index = i;
                    a.click(function(e) {
                        load_page($(this).data().index);
                        e.preventDefault();
                    });
                }
            }
            var li_next = $("<li />").append($("<a />").attr("href", "#").html('&raquo;'));
            pagination_container.append(li_next);
            if(page_index == page_count) li_next.addClass("disabled");
            else {
                li_next.click(function(e) {
                    load_page(page_index + 1);
                    e.preventDefault();
                });
            }
        });
    }

    load_page(1);
    r.data().load = function(i) { load_page(i); };
    return r;
}
