import { guid } from "../utils";
import * as FS from "fs";
import * as Path from "path";
import * as Electron from "electron";

export interface DataManifest {
    type: string;
    timestamp: number;
    name: string;
    description: string;
    path?: string;
}

export class DataStorage {
    constructor() {
    }

    static getStorageDir() {
        let userDataPath = Electron.remote.app.getPath("userData");
        return userDataPath;
    }
    static getStoragePath(filename: string) {
        return Path.join(this.getStorageDir(), filename);
    }

    static addItem(manifest: DataManifest, object: any) {
        let name = guid();
        let timestamp = Math.round(new Date().getTime() / 1000);
        let filename = timestamp + "-" + name;
        let json_manifest = JSON.stringify(manifest);
        let json_object = JSON.stringify(object);

        FS.writeFileSync(this.getStoragePath(filename + ".data.json"), json_object);
        FS.writeFileSync(this.getStoragePath(filename + ".manifest.json"), json_manifest);
        return this.getStoragePath(filename);
    }

    static getDataPath(path: string) {
        return path + ".data.json";
    }

    static list(): DataManifest[] {
        let items = FS.readdirSync(this.getStorageDir());
        let result: DataManifest[] = [];
        for (let it of items) {
            if (it.endsWith(".manifest.json")) {
                let manifest = JSON.parse(FS.readFileSync(this.getStoragePath(it), "utf-8"));
                manifest.path = this.getStoragePath(it).replace(/\.manifest\.json$/, "");
                result.push(manifest);
            }
        }
        return result;
    }
}