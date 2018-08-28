import * as Electron from "electron";
import * as Path from "path";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as FS from "fs";
import { Form, Input, Icon, Button, Layout, Row, Col } from "antd";
import { APIClient, parseWeiboURL } from "../weibo_api/android_api";
import { CascadeCrawler, CascadeCrawlerResult } from "../crawler/cascade";
import { guid } from "../utils";
import { DataStorage, DataManifest } from "./storage";
import * as FileSaver from "file-saver";

function downloadDataset(path: string, type: "json" | "csv") {
    let dataPath = DataStorage.getDataPath(path);
    let content = FS.readFileSync(dataPath, "utf-8");
    if (type == "json") {
        let blob = new Blob([content]);
        FileSaver.saveAs(blob, Path.basename(dataPath));
    } else {
        let data = JSON.parse(content);
        let csvContent: string[] = [];
        csvContent.push(data.fields);
        for (let row of data.data) {
            csvContent.push(data.fields.map((x: any, i: number) => JSON.stringify(row[i])).join(","));
        }
        let blob = new Blob([csvContent.join("\n")]);
        FileSaver.saveAs(blob, Path.basename(dataPath) + ".csv");
    }
}

let globalApplicationView: ApplicationView;

function startWeiboEventsApp(path: string) {
    globalApplicationView.startWeiboEvents(path);
}

export interface CrawlerViewProps {
    id: string;
    username: string;
    password: string;
    weiboURL: string;
}

export interface CrawlerViewState {
    crawlResult?: CascadeCrawlerResult;
    crawlResultPath?: string;
    log: [string, string][];
}

export class CrawlerView extends React.Component<CrawlerViewProps, CrawlerViewState> {
    state: CrawlerViewState = {
        log: []
    };

    async crawlerJob() {
        try {
            let username = this.props.username;
            let password = this.props.password;
            let weiboURL = this.props.weiboURL;
            let parsed = parseWeiboURL(weiboURL);
            let client = await APIClient.Login(username, password);

            // Login successful, save username and password
            window.localStorage.setItem("login", JSON.stringify([username, password]));

            let crawler = new CascadeCrawler(client, this);
            let result = await crawler.crawl(parsed.mid);
            let path = DataStorage.addItem({
                name: weiboURL,
                description: (result.data[0][result.fields.indexOf("username")] + ": " + result.data[0][result.fields.indexOf("text")]) as string,
                type: "cascade",
                timestamp: new Date().getTime()
            }, result);
            this.setState({
                crawlResult: result,
                crawlResultPath: path
            });
        } catch (e) {
            this.log("ERROR", e.message);
        }
    }

    log(type: string, message: string) {
        this.state.log.push([type, message]);
        this.setState({
            log: this.state.log
        });
    }

    componentDidMount() {
        this.crawlerJob();
    }

    render() {
        return (
            <div className="crawler-job">
                <h4>Job: {this.props.weiboURL}</h4>
                <p>
                    <Button type="primary" disabled={this.state.crawlResultPath == null} onClick={() => {
                        startWeiboEventsApp(this.state.crawlResultPath);
                    }}>可视分析</Button>
                    {" "}
                    <Button type="primary" disabled={this.state.crawlResultPath == null} onClick={() => {
                        downloadDataset(this.state.crawlResultPath, "csv");
                    }}>下载数据 (CSV)</Button>
                    {" "}
                    <Button type="primary" disabled={this.state.crawlResultPath == null} onClick={() => {
                        downloadDataset(this.state.crawlResultPath, "json");
                    }}>下载数据 (JSON)</Button>
                </p>
                <ul className="status-list">
                    {this.state.log.map((x, i) => <li key={i}>{x[0]} {x[1]}</li>)}
                </ul>
            </div>
        );
    }
}

export interface StartupViewState {
    jobs: CrawlerViewProps[];
    data: DataManifest[];
}

export class StartupView extends React.Component<{}, StartupViewState> {
    state: StartupViewState = {
        jobs: [],
        data: DataStorage.list()
    };

    componentDidMount() {
        if (window.localStorage.getItem("login")) {
            let info = JSON.parse(window.localStorage.getItem("login"));
            this.refs.inputUsername.input.value = info[0];
            this.refs.inputPassword.input.value = info[1];
        }
    }

    refs: {
        inputUsername: Input;
        inputPassword: Input;
        inputWeiboURL: Input;
    }

    async startCrawlingProcess() {
        let username = this.refs.inputUsername.input.value;
        let password = this.refs.inputPassword.input.value;
        let weiboURL = this.refs.inputWeiboURL.input.value;
        this.state.jobs.push({
            id: guid(),
            username: username,
            password: password,
            weiboURL: weiboURL
        });
        this.setState({
            jobs: this.state.jobs
        });
    }

    render() {
        return (
            <div className="startup-view">
                <Row gutter={24}>
                    <Col span={8}>
                        <h2>数据抓取</h2>
                        <p><b>输入用于抓取数据的微博账户（邮箱）和密码。为了安全起见，请注册一个专用账户，不要使用您的主要微博账户。</b>抓取过程全部在本机执行，我们不会收集您的密码，但为了安全起见请设定一个专用密码。</p>
                        <p>Enter Weibo username (email) and password below. Do NOT use your regular account. Please register a new account ONLY for this application.</p>
                        <Row gutter={8}>
                            <Col span={12}>
                                <Input ref="inputUsername" prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Username" />
                            </Col>
                            <Col span={12}>
                                <Input ref="inputPassword" prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />} type="password" placeholder="Password" />
                            </Col>
                        </Row>
                        <p><b>输入要抓取的微博的地址，如：http://weibo.com/1610356014/A3j83wqYQ</b></p>
                        <p>Enter the Weibo URL you want to crawl, e.g., http://weibo.com/1610356014/A3j83wqYQ</p>
                        <Row gutter={8}>
                            <Col span={24}>
                                <Input ref="inputWeiboURL" placeholder="Weibo URL" />
                            </Col>
                        </Row>
                        <p>
                            <Button type="primary" onClick={() => {
                                this.startCrawlingProcess();
                            }}>开始抓取</Button>
                        </p>
                    </Col>
                    <Col span={16}>
                        <div className="col-lists">
                            <h2>Crawler Jobs</h2>
                            {this.state.jobs.map(job => (
                                <CrawlerView key={job.id} id={job.id} username={job.username} password={job.password} weiboURL={job.weiboURL} />
                            ))}
                            <h2>Datasets</h2>
                            {this.state.data.map(item => (
                                <div className="crawler-job">
                                    <div className="el-name">{item.name}</div>
                                    <div className="el-date">Date Crawled: {new Date(item.timestamp).toLocaleString()}</div>
                                    <div className="el-description">{item.description}</div>
                                    <p>
                                        <Button onClick={() => {
                                            startWeiboEventsApp(item.path);
                                        }}>可视分析</Button>
                                        {" "}
                                        <Button onClick={() => {
                                            downloadDataset(item.path, "csv");
                                        }}>下载数据 (CSV)</Button>
                                        {" "}
                                        <Button onClick={() => {
                                            downloadDataset(item.path, "json");
                                        }}>下载数据 (JSON)</Button>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Col>
                </Row >
            </div >
        );
    }
}

export class WeiboEventsView extends React.Component<{ dataset: any }, {}> {
    refs: {
        iframe: HTMLIFrameElement;
    }

    render() {
        return (
            <div className="weiboevents-view">
                <iframe src="weiboevents.html" ref="iframe" onLoad={() => {
                    this.refs.iframe.contentWindow.postMessage({
                        dataset: this.props.dataset
                    }, "*");
                }} />
            </div>
        );
    }
}

export interface ApplicationViewState {
    mode: "startup" | "weiboevents";
    dataset: any;
}
export class ApplicationView extends React.Component<{}, ApplicationViewState> {
    state: ApplicationViewState = {
        mode: "startup",
        dataset: null
    };

    componentDidMount() {
        globalApplicationView = this;
    }

    startWeiboEvents(path: string) {
        let dataFile = DataStorage.getDataPath(path);
        let dataset = JSON.parse(FS.readFileSync(dataFile, "utf-8"));
        this.setState({
            mode: "weiboevents",
            dataset: dataset
        });
    }

    render() {
        if (this.state.mode == "startup") {
            return (
                <div className="application-view">
                    <div className="main-header">WeiboEvents - 北京大学 PKUVIS 微博可视分析工具</div>
                    <StartupView />
                </div>
            );
        } else {
            return (
                <div className="application-view">
                    <div className="main-header"><a href="#" onClick={() => {
                        this.setState({ mode: "startup", dataset: null });
                    }}>(返回)</a> WeiboEvents - 北京大学 PKUVIS 微博可视分析工具</div>
                    <WeiboEventsView dataset={this.state.dataset} />
                </div>
            );
        }
    }
}

ReactDOM.render(<ApplicationView />, document.getElementById("container"));