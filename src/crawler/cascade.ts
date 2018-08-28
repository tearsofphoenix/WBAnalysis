import { APIClient } from "../weibo_api/android_api";

export interface Logger {
    log(type: string, str: string): void;
}

let weformat_keys = [
    "id",
    "mid",
    "uid",
    "parent",
    "t",
    "reposts_count",
    "attitudes_count",
    "comments_count",
    "text",
    "original_text",
    "user_created_at",
    "followers_count",
    "bi_followers_count",
    "favourites_count",
    "statuses_count",
    "friends_count",
    "username",
    "screen_name",
    "user_description",
    "gender",
    "province",
    "city",
    "verified",
    "verified_reason",
    "verified_type",
    "user_location",
    "user_avatar",
    "user_geo_enabled",
    "picture",
    "geo",
];

function convert_time_to_timestamp(time: string) {
    return new Date(time).getTime() / 1000;
}

function process_text(text: string) {
    // Remove the text after //@.
    return text.replace(/ *\/\/@.*/g, "");
}

function WeiboEventFormatTweet(tweet: any, is_root = false) {
    let user = tweet['user'];
    let parent;
    if (is_root) {
        parent = null;
    } else {
        if ('pid' in tweet) {
            parent = tweet['pid'].toString()
        } else {
            parent = tweet['retweeted_status']['mid'].toString();
        }
    }
    let d: { [name: string]: any } = {
        'id': tweet['idstr'],
        'mid': tweet['mid'],
        'uid': user['id'],
        'parent': parent,
        't': convert_time_to_timestamp(tweet['created_at']),
        'reposts_count': tweet['reposts_count'],
        'attitudes_count': tweet['attitudes_count'],
        'comments_count': tweet['comments_count'],
        'text': process_text(tweet['text']),
        'original_text': tweet['text'],
        'followers_count': user['followers_count'],
        'bi_followers_count': user['bi_followers_count'],
        'favourites_count': user['favourites_count'],
        'statuses_count': user['statuses_count'],
        'friends_count': user['friends_count'],
        'username': user['name'],
        'screen_name': user['screen_name'],
        'user_description': user['description'],
        'gender': user['gender'],
        'province': user['province'],
        'city': user['city'],
        'verified': user['verified'],
        'verified_reason': user['verified_reason'],
        'verified_type': user['verified_type'],
        'user_created_at': convert_time_to_timestamp(user['created_at']),
        'user_location': user['location'],
        'user_avatar': user['avatar_large'],
        'user_geo_enabled': user['geo_enabled'],
        'picture': 'original_pic' in tweet ? tweet['original_pic'] : null,
        'geo': tweet['geo'],
    };
    return weformat_keys.map(x => d[x]);
}

export class CascadeCrawlerResult {
    fields: string[];
    data: any[][];
}

export class CascadeCrawler {
    logger: Logger;
    client: APIClient;

    constructor(client: APIClient, logger: Logger) {
        this.logger = logger;
        this.client = client;
    }

    log(type: string, str: string) {
        this.logger.log(type, str);
    }

    async api(path: string, params: { [name: string]: number | string }) {
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                let result = await this.client.api(path, params);
                return result;
            } catch (e) {
                this.log("ERROR", "API call failure: " + e.message);
            }
        }
        throw new Error("API call failure");
    }

    async crawl(rootID: string, maxPages: number = 2000) {
        let rootTweet = await this.api("statuses/show", { id: rootID });
        let N_retweets = rootTweet['reposts_count']
        let N_pages = Math.ceil(N_retweets / 180) + 1;
        if (N_pages > maxPages) {
            N_pages = maxPages;
        }
        let crawled_tweets = new Map();

        function insert_tweet(tweet: any, is_root: boolean = false) {
            let stored_tweet: { [name: string]: any } = { 'mid': tweet['mid'] };
            crawled_tweets.set(tweet['mid'], stored_tweet);
            let cleaned;
            if ('deleted' in tweet && tweet['deleted'] == '1') {
                // Deleted tweet.
                this.log("info", `DELETED:${tweet['mid']}`);
                cleaned = null;
            } else {
                cleaned = WeiboEventFormatTweet(tweet, is_root);
            }
            stored_tweet['__wefmt__'] = cleaned;
        }
        insert_tweet(rootTweet, true);
        this.log("ROOT", `RE:${N_retweets},PAGES:${N_pages}`);
        for (let pagenum = 1; pagenum <= N_pages; pagenum++) {
            let fast_mode = false;
            if (pagenum <= 10) {
                fast_mode = true;
            }
            let tweets: any = { "reposts": [] };

            try {
                tweets = await this.api("statuses/repost_timeline", { "id": rootID, "count": "200", "page": pagenum });
            } catch (e) {
                this.log("PAGE", `INDEX:${pagenum}/${N_pages},ERROR`);
            }

            let reposts = tweets['reposts'];

            for (let tweet of reposts) {
                insert_tweet(tweet);
            }
            this.log("PAGE", `INDEX:${pagenum},COUNT:${reposts.length},TOTAL:${crawled_tweets.size}`);
        }

        let deleted_count = 0;

        let wef_parent_index = weformat_keys.indexOf("parent");
        let wef_t_index = weformat_keys.indexOf("t");
        let wef_mid_index = weformat_keys.indexOf("mid");

        while (true) {
            // Erase descendants of deleted tweets.
            while (true) {
                let cleaned = false;
                let deleted_tweets = new Set();
                for (let tweet of crawled_tweets.values()) {
                    if (!tweet['__wefmt__']) {
                        deleted_tweets.add(tweet['mid']);
                    }
                }
                for (let value of crawled_tweets.values()) {
                    if (value['__wefmt__']) {
                        if (deleted_tweets.has(value['__wefmt__'][wef_parent_index])) {
                            value['__wefmt__'] = null;
                            cleaned = true;
                            deleted_count += 1;
                        }
                    }
                }
                if (!cleaned) break;
            }
            // Collect tweets that are in the parent set, but not in crawled_tweets (unseen tweets)
            let unseen_tweets = new Set();
            for (let value of crawled_tweets.values()) {
                if (value['__wefmt__']) {
                    if (value['__wefmt__'][wef_parent_index] != null) {
                        if (!crawled_tweets.has(value['__wefmt__'][wef_parent_index])) {
                            unseen_tweets.add(value['__wefmt__'][wef_parent_index]);
                        }
                    }
                }
            }
            if (unseen_tweets.size == 0) break;

            this.log("FIXUP", `MISSING:${unseen_tweets.size}`);

            // We are no longer able to access this api, sadly...
            // info = api("statuses/show_batch", { "ids": ",".join(map(str, to_crawl)) }, fast = True)
            // for s in info['statuses']:
            //     insert_tweet(s)
            //     to_crawl.remove(s['mid'])
            for (let mid of unseen_tweets) {
                // Some tweets might be hidden from the API (ie. private tweets)
                this.log("INFO", `HIDDEN:${mid}`)
                crawled_tweets.set(mid, { 'hidden': true, 'mid': mid, '__wefmt__': null });
            }
        }

        this.log("FIXUP", `WEFORMAT.ERASED:${deleted_count}`);

        let cleaned_list = [];
        for (let tweet of crawled_tweets.values()) {
            if (tweet['__wefmt__']) {
                cleaned_list.push(tweet['__wefmt__']);
            }
        }
        cleaned_list.sort((a, b) => {
            let va = a[wef_parent_index] != null ? a[wef_t_index] : 0;
            let vb = b[wef_parent_index] != null ? b[wef_t_index] : 0;
            return va - vb;
        });
        let we_fields = weformat_keys;
        let we_data = cleaned_list;
        let we_format: CascadeCrawlerResult = { "fields": we_fields, "data": we_data };

        this.log("DONE", `TOTAL:${crawled_tweets.size}`);

        for (let t of crawled_tweets.values()) {
            delete t['__wefmt__'];
        }

        // id_map = dict([ (t[wef_mid_index], t) for t in cleaned_list ])
        // for t in cleaned_list:
        //     if t[wef_parent_index] != None and t[wef_parent_index] not in id_map:
        //         print t[wef_parent_index]

        return we_format;
    }
}