import React, { Component } from 'react';
import $ from 'jquery';
import fs from 'fs';
import ReactDOM, { render } from 'react-dom';
import styles from './App.css';
import { C, LIST, SEARCH_URL, HUE } from '../common/constants';
import { shell, ipcRenderer } from 'electron';

const iconutil = require('iconutil');

const tinycolor = require('tinycolor2');


let hueBridgeIp = '';
let hueUserName = '';

import request from 'superagent';
export default class App extends Component {
  
  constructor(props) {
    super(props);

    this.state = {
      allFiles: [],
      results: [],
      input: '',
      inputColor: '#ffffff',
      selectedIndex: 0,
      huePower: false,
      hueConnected: false
    };
  }
  
  componentWillMount() {
    let appList = this.getApplicationList();
    this.setState({
      allFiles: appList
    });
    // ipc通信につなぐ
    this.ipcInit();
  }

  render() {
    let jsxs = this.getResultsJsxs();
    const inputStyle = {
      backgroundColor: this.state.inputColor
    };
    return (
      <div className="page">
        <input type="text" id="input" className={styles.searchInput} ref="input" value={this.state.input} onKeyDown={(e) => { this.onKeyDown(e); }} onChange={(e) => { this.filter(e); }} />
        <div className={styles.top_icon} style={inputStyle}>
          <img src="../icon.png" className={styles.top_img} alt="" />
        </div>
        { jsxs }
      </div>
    );
  }

  componentDidMount() {
    this.getAppIcons();
  }

   // メインウインドウの開閉を受信
  ipcInit() {
    ipcRenderer.on('mainWindowHide', () => {
      this.setState({
        input: '',
        results: [],
        selectedIndex: 0
      });
    });

    ipcRenderer.on('mainWindowShow', () => {
      const input = ReactDOM.findDOMNode(this.refs.input);
      input && input.focus();
    });

    ipcRenderer.on('connectHue', () => {
      this.connectHue();
    });
  }

  filter(e) {
    const inputVal = e.target.value;
    let results = [];
    if (inputVal.length !== 0) {
      results = this.state.allFiles.filter((file) => {
        // すべて小文字にしてから包含を判定
        return (file.name.toLowerCase().indexOf(inputVal.toLowerCase()) !== -1);
      });
      
      if (this.state.hueConnected) {
        // hue commandを追加
        results.push({ name: 'light -on/off', icon: '../icon_default.png', type: 'hue' });
      }

      // カラーコード追加
      if (inputVal.match(/^#([\da-fA-F]{6}|[\da-fA-F]{3})$/
)) {
        this.state.inputColor = inputVal;

        results.push({ name: 'light - change color', icon: '../icon_default.png', type: 'hue' });
      }else{
        this.state.inputColor = '#ffffff';
      }

      // web検索追加
      results.push({ name: 'www search...', icon: '../icon_search.png', type: 'search' });
    } else {
      results = [];
    }
    
    // main側に候補数を送信
    ipcRenderer.send('inputChange', results.length);
  
    this.setState({ 
      results,
      input: inputVal,
      selectedIndex: 0
    }); 
  }

  onKeyDown(e) {
    let selectedIndex = this.state.selectedIndex;

    switch (e.keyCode) {
      // 上キー
      case 38: 
        e.preventDefault();
        if (selectedIndex !== 0) {
          selectedIndex -= 1;
          this.setState({
            selectedIndex          
          });
        }
        break;
      
      // 下キー
      case 40:
        e.preventDefault();
        if (selectedIndex !== this.state.results.length - 1) {
          selectedIndex += 1;
          this.setState({
            selectedIndex  
          });
        }
        break;
      // エンターキー
      case 13:
        if (this.state.results.length !== 0) {
          const item = this.state.results[this.state.selectedIndex];
          this.launch(item);
        }
        break;
      default:
        break;
    }
  }
  
  launch(item) {
    switch(item.type) { 
      case 'app':
        shell.openItem(item.filePath);
        break;
      case 'search':
        shell.openExternal(SEARCH_URL + this.state.input);
        break;
      case 'hue':   
        this.hueControl(item);
      default:
        break;
    }
  }

  onMouseOver(i, e) {
    this.setState({
      selectedIndex: i
    });
  }
  
  onClick(i, e) {
    const item = this.state.results[i];
    this.launch(item);
  }


  // componentWillMountにresult stateの初期値となるリストを返す
  getApplicationList() {
    // Application を追加
    const appDir = '/Applications/';
    const appList = fs.readdirSync(appDir).filter((file) => {
      // '.app' で終わるファイルのみreturn
      return file.slice(-4) === '.app';
    }).map((appName) => {
      return { name: appName.slice(0, -4), filePath: appDir + appName, icon: '../icon_default.png', type: 'app' };
    });
    return appList;   
  }

  getResultsJsxs() {
    let results = this.state.results;
    let jsxs = results.map((result, i) => {
      let selectFlg = '';
      
      const selectedClassName = (i === this.state.selectedIndex) ? ` ${styles.selected}` : '';
      const listClassName = styles['list-group-item'] + selectedClassName;

      return (
        <div className={listClassName} key={i} onClick={this.onClick.bind(this, i)} onMouseOver={this.onMouseOver.bind(this, i)} ><img src={result.icon} className={styles.appIcon} />{ result.name }</div>
      );
    });
    return jsxs;
  }

  getAppIcons() {
    this.state.allFiles.forEach((result) => {
      // アイコン取得はappの時だけ
      if (result.type === 'app') {
        this.iconToBase64(this.pathToIcon(result.filePath), result.name);
      }
    });
  }

  // アプリのpathを渡されたらそのアイコンへのpathを返す関数
  pathToIcon(filePath) {
    const plist = fs.readFileSync(filePath + '/contents/info.plist', 'utf-8');
    
    let iconPath; 
    plist.toString().split('\n').forEach((line, i, a) => {
      if (line.indexOf('<key>CFBundleIconFile</key>') !== -1) {
        const match = a[i + 1];  
        const string = match.replace(/<string>|<\/string>|\s|\.icns/g, '');
        iconPath = (filePath + '/contents/resources/' + string + '.icns');
      }
    });
    return iconPath;
  }
  
  // icnファイルをbase64にデコードし、終わったらstateに書き込む
  iconToBase64(icns, appName) {
    const base64 = iconutil.toIconset(icns, (err, icons) => {
      const base64 = icons['icon_128x128.png'].toString('base64');
      // allFIlesの該当アプリiconを書き換えたコピーを用意
      const allFiles = this.state.allFiles.map((e) => {
        if (e.name === appName) {    
          e.icon = 'data:image/png;base64,' + base64;
        }
        return e;
      });
      //コピーでstate書き換え
      this.setState({
        allFiles
      });
    });
  }
  hueControl(item) {
    switch(item.name) {
      // on/off切り替え
      case 'light -on/off':
        this.sendHue({ on: !this.state.huePower });
        this.setState({
          huePower: !this.state.huePower
        });
        break;
      case 'light - change color':
        const hsv = tinycolor(this.state.input).toHsv();
        this.sendHue({ hue: Math.floor(hsv.h * 182), sat: Math.floor(hsv.s * 254), bri: Math.floor(hsv.v * 254) });
        break;
      default:
        break;
    }
  }
  

  connectHue() {
    request
    .get(HUE.MEET_URL)
    .set('Accept', 'application/json')
    .end((err, res) => {

      hueBridgeIp = res.body[0].internalipaddress;
      
      const hueApiUrl = 'http://' + hueBridgeIp + '/api';
      alert('hue bridgeのlink buttonを押して下さい');
      request
      .post(hueApiUrl)
      .set('Accept', 'application/json')
      .send(JSON.stringify({ 'devicetype': 'my_hue_app#nehuyunehuyu' }))
      .end((err, res) => {
        // 接続に成功したら
        if (res) {  
          hueUserName = res.body[0].success.username;
          alert('接続されました');
          this.getHueState();
          this.setState({
            hueConnected: true
          });
        } else {
          alert('接続に失敗しました');
        }
      });
    });    
    // hueの初期状態を取得
      }

  // hueと通信してstateを更新
  getHueState() {
    const url = 'http://' + hueBridgeIp + '/api/' + hueUserName;
    $.get(url, false, (e) => {
      this.setState({
        huePower: e.lights[HUE.ID].state.on
      });
    });
  }
  sendHue(data) {
    const dataJson = JSON.stringify(data);
    const url = 'http://' + hueBridgeIp + '/api/' + hueUserName + '/lights/' + HUE.ID + '/state'; 
    $.ajax({
      'url': url,
      'data': dataJson,
      'success': (e) => {}, 
      'type': 'PUT',
      'cache': false,
      'error': (e) => {},
      'dataType': 'json'
    });
  }
}
