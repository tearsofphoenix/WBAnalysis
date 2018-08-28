(function() {
// Data Provider for iVisDesigner.
var iframe = document.createElement("iframe");
iframe.style.display = "none";
iframe.src = "http://vis.pku.edu.cn/weibova/weiboevents/dataprovider.html";

WEConnection = { };
var serial = 0;
var listeners = { };

iframe.onload = function() {
    window.addEventListener("message", function(event) {
        if(event.origin == "http://vis.pku.edu.cn") {
            var obj = JSON.parse(event.data);
            if(listeners[obj.serial]) listeners[obj.serial](obj);
        }
    });
};
document.body.appendChild(iframe);

WEConnection.call = function(params, callback) {
    if(!callback) callback = function() { };
    (function(serial) {
        listeners[serial] = function(obj) {
            delete listeners[serial];
            callback(obj);
        };
        params.serial = serial;
        iframe.contentWindow.postMessage(JSON.stringify(params), "http://vis.pku.edu.cn");
    })("CALL:" + serial.toString());
    serial += 1;
};

})();
