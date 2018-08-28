// (function() {
//     setInterval(function() {
//         STK.selector(".WB_time").forEach(function(node) {
//             if(node.nextSibling && node.nextSibling.__is_pkuvis) return;
//             var newnode = document.createElement("a");
//             newnode.setAttribute("target", "_blank");
//             newnode.setAttribute("href", "http://vis.pku.edu.cn/weibova/weiboevents2/weiboevents.html?event=http://weibo.com" + node.getAttribute("href"));
//             newnode.innerHTML = " 可视分析 ";
//             newnode.setAttribute("title", "用 PKUVIS 微博可视分析工具 (WeiboEvents) 分析本微博");
//             newnode.__is_pkuvis = true;
//             node.parentNode.insertBefore(newnode, node.nextSibling);
//         });
//     }, 1000);
// })();

setInterval(function() {
    STK.selector("[node-type=feed_list_item_date]").forEach(function(a) {
        if(a.children.length == 0) {
            a.innerHTML += (' <a target="_blank" style="position:absolute; top: 0px; left: -140px; width: 130px; border-radius: 2px; line-height: 1em; text-align:center; padding: 4px 3px; z-index: 100000; background-color: white; border: 1px solid #AAA;" href="http://vis.pku.edu.cn/weibova/weiboevents/weiboevents.html?event=' + escape(a.href) + '">用 WeiboEvents 分析</a>');
            a.parentElement.parentElement.parentElement.style.position = "relative";
        }
    });
}, 100);
