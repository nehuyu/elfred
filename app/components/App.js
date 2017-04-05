import React, { Component } from 'react';
import $ from 'jquery';
import fs from 'fs';
import ReactDOM, { render } from 'react-dom';
import styles from './App.css';
import { C, LIST } from '../common/constants';
import { shell, ipcRenderer } from 'electron';

const iconutil = require('iconutil');

export default class App extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      allFiles: [],
      results: [],
      input: '',
      selectedIndex: 0
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
    return (
      <div className="page">
        <input type="text" id="input" className={styles.searchInput} ref="input" value={this.state.input} onKeyDown={(e) => { this.onKeyDown(e); }} onChange={(e) => { this.filter(e); }} />
        <div className={styles.top_icon}>
          <img src="../icon.png" className={styles.top_img} alt=""/>
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
  }

  filter(e) {
    const inputVal = e.target.value;
    let results = [];
    if (inputVal.length !== 0) {
      results = this.state.allFiles.filter((file) => {
        // すべて小文字にしてから包含を判定
        return (file.name.toLowerCase().indexOf(inputVal.toLowerCase()) !== -1);
      }).slice(0, LIST.LENGTH);
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
          const path = this.state.results[this.state.selectedIndex].path;
          shell.openItem(path);  
        }
        break;
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
    const path = this.state.results[i].path;
    shell.openItem(path);
  }


  // componentWillMountにresult stateの初期値となるリストを返す
  getApplicationList() {
    const appDir = '/Applications/';
    const appList = fs.readdirSync(appDir).filter((file) => {
      // '.app' で終わるファイルのみreturn
      return file.slice(-4) === '.app';
    }).map((appName) => {
      return { name: appName.slice(0, -4), path: appDir + appName, icon: '../icon_default.png' };
      return { name: appName.slice(0, -4), path: appDir + appName, icon: '../icon_default.png', type: 'app' };
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
      this.iconToBase64(this.pathToIcon(result.path), result.name);
    });
  }

  // アプリのpathを渡されたらそのアイコンへのpathを返す関数
  pathToIcon(path) {
    const plist = fs.readFileSync(path + '/contents/info.plist', 'utf-8');
    
    let iconPath; 
    plist.toString().split('\n').forEach((line, i, a) => {
      if (line.indexOf('<key>CFBundleIconFile</key>') !== -1) {
        const match = a[i + 1];  
        const string = match.replace(/<string>|<\/string>|\s|\.icns/g, '');
        iconPath = (path + '/contents/resources/' + string + '.icns');
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
}
