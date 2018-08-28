function format_unix_time(s) {
    return new Date(s * 1000).getFullString();
};

var page_size = 50;