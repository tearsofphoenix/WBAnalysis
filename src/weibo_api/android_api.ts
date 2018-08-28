import * as crypto from "crypto";
import * as request from "request";
import { rejects } from "assert";

const CFG_client = "android";
const CFG_ua = "Oppo-LT39i__weibo__4.1.5__android__android4.2.0";
const CFG_from = "1041595010";
const CFG_wm = "4260_0001";
const CFG_PKEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC46y69c1rmEk6btBLCPgxJkCxdDcAH9k7kBLffgG1KWqUErjdv+aMkEZmBaprEW846YEwBn60gyBih3KU518fL3F+sv2b6xEeOxgjWO+NPgSWmT3q1up95HmmLHlgVwqTKqRUHd8+Tr43D5h+J8T69etX0YNdT5ACvm+Ar0HdarwIDAQAB";

const API_HOST = "http://api.weibo.cn/";

function md5_string(data: string) {
    return crypto.createHash('md5').update(data).digest("hex");
}

function calcChecksum(uid: string) {
    let md5 = md5_string(uid + "5l0WXnhiY4pJ794KIJ7Rw5F45VXg9sjo");
    return [md5[1], md5[5], md5[2], md5[10], md5[17], md5[9], md5[25], md5[27]].join("").toLowerCase();
}

function rsa_encrypt(toEncrypt: string) {
    let data = new Buffer(toEncrypt, "utf-8");
    let r = crypto.publicEncrypt({
        key: `-----BEGIN PUBLIC KEY-----\n${CFG_PKEY}\n-----END PUBLIC KEY-----`,
        padding: (crypto as any).constants.RSA_PKCS1_PADDING
    }, data);
    return r.toString("base64");
};

interface ILoginResponse {
    screen_name: string;
    uid: string;
    gsid: string;
    oauth_token: string;
    oauth_token_secret: string;
    "oauth2.0": {
        access_token: string;
        issued_at: number; // unix time
        expires: number;
    }
}

function login(username: string, password: string): Promise<APIClient> {
    let url = API_HOST + "2/account/login";
    let params = {
        'from': CFG_from,
        'ua': CFG_ua,
        'wm': CFG_wm,
        'oldwm': CFG_wm,
        'c': CFG_client
    };
    let payload = {
        'flag': "1",
        'u': username,
        's': calcChecksum(username + password),
        'c': CFG_client,
        'p': rsa_encrypt(password),
        'device_id': '1349404812345678123456781234567812345678',
        'device_name': 'Oppo-LT39i',
        'imei': '325436541349404',
        'validation': 'true'
    };
    let headers = {
        "user-agent": CFG_ua
    };

    return new Promise<APIClient>((resolve, reject) => {
        request.post(url, {
            qs: params,
            form: payload,
            headers: headers,
            timeout: 60000,
        }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                console.log(78, data.body)
                let json = JSON.parse(data.body) as ILoginResponse;
                if (json.gsid && json.uid && json.oauth_token) {
                    resolve(new APIClient(json));
                } else {
                    reject(new Error("Login failure " + data.body));
                }
            }
        });
    });
}

function str62to10(str62: string) {
    var str62keys = [
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
    ];
    var i10 = 0;
    for (var i = 0; i < str62.length; i++) {
        var n = str62.length - i - 1;
        var s = str62[i];
        i10 += str62keys.indexOf(s) * Math.pow(62, n);
    }
    return i10;
};

function getMidFromURL(url: string) {
    var mid = '';
    for (var i = url.length - 4; i > -4; i -= 4) {
        var offset1 = i < 0 ? 0 : i;
        var offset2 = i + 4;
        var str = url.substring(offset1, offset2);
        str = str62to10(str).toString();
        if (offset1 > 0)
            while (str.length < 7) str = '0' + str;
        mid = str + mid;
    }
    return mid;
};

export function parseWeiboURL(url: string) {
    var m;
    if (m = url.match(/^https?\:\/\/(www\.|e.)?weibo\.com\/([0-9a-zA-Z\.\-\_]+)\/([0-9a-zA-Z\.\-\_]+)/)) {
        var uid = m[2];
        var mid = getMidFromURL(m[3]);
        return { uid: uid, mid: mid };
    }
    return;
};

export class APIClient {
    session: ILoginResponse;
    constructor(resp: ILoginResponse) {
        this.session = resp;
    }

    api(api_url: string, api_params: { [name: string]: any }) {
        let url = API_HOST + "2/" + api_url;
        let params = {
            "c": CFG_client,
            "ua": CFG_ua,
            "gsid": this.session['gsid'],
            "s": calcChecksum(this.session['uid']),
            ...api_params
        }
        let headers = {
            "user-agent": CFG_ua
        }
        return new Promise<any>((resolve, reject) => {
            request.get(url, {
                qs: params,
                headers: headers,
                timeout: 60000
            }, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    let json = JSON.parse(data.body);
                    if (json.errmsg) {
                        reject(new Error("API error: " + data.body));
                    } else {
                        resolve(json);
                    }
                }
            });
        });
    }

    static async Login(username: string, password: string): Promise<APIClient> {
        return await login(username, password);
    }
}
