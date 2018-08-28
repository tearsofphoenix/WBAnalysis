// Action log system.
var action_logs = [];
var log_user_action = function(type, params) {
    console.log("Action:", type);
    action_logs.push({
        type: type,
        t: parseInt(new Date().getTime() / 1000),
        params: params
    });
};

log_user_action("startup", { });

var perform_xdcall = function() { return { }; };

(function() {
var listener = function(storage_event) {
            if(storage_event.key == "we-response") {
                var data = window.localStorage.getItem("we-response");
                var r = JSON.parse(event.data);
                if(r.serial == obj.serial) {
                    event.source.postMessage(data, event.origin);
                    window.removeEventListener(listener);
                }
            }
        };
window.addEventListener("storage", function(storage_event) {
    if(storage_event.key == "we-call") {
        var data = JSON.parse(window.localStorage.getItem("we-call"));
        obj = perform_xdcall(data);
        obj.serial = data.serial;
        window.localStorage.setItem("we-response", JSON.stringify(obj));
    }
}, false);
})();
