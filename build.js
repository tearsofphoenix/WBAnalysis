var fs = require("fs");
var path = require("path");

function resolve_include(code, dirname) {
    return code.replace(/\{\{include\: *(.*?)\}\}/g, function (m, filename) {
        let target = path.join(dirname, filename);
        code = resolve_include(fs.readFileSync(target, "utf-8"), path.dirname(target)) + "\n";
        return code;
    });
}

function concat_builder(output, files) {
    var code = "";
    for (var f of files) {
        code += resolve_include(fs.readFileSync(f, "utf-8"), path.dirname(f)) + "\n";
    }
    fs.writeFileSync(output, code, "utf-8");
}

concat_builder("dist/libraries.js", [
    "legacy_code/libraries/jquery.js",
    "legacy_code/libraries/jquery-cookie.js",
    "legacy_code/libraries/jquery.mousewheel.js",
    "legacy_code/libraries/chroma.js",
    "legacy_code/scripts/timeline.js",
    "legacy_code/scripts/sketchpad.js",
    "legacy_code/scripts/jsfr.js",
    "legacy_code/scripts/utils.js",
    "legacy_code/iconfont/iconfont.css.js"
]);

concat_builder("dist/weiboevents.js", [
    "legacy_code/scripts/data.js",
    "legacy_code/scripts/weiboevents.js"
]);

concat_builder("dist/iconfont.css", [
    "legacy_code/iconfont/iconfont.css"
]);