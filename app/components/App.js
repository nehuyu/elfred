import React, { Component } from 'react';
import $ from 'jquery';
import fs from 'fs';
import ReactDOM, { render } from 'react-dom';
import styles from './App.css';
import { C, LIST } from '../common/constants';
import { shell, ipcRenderer } from 'electron';

export default class App extends Component {
  
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

  constructor(props) {
    super(props);
    this.state = {
      allFiles: [],
      results: [],
      input: '',
      selectedIndex: 0
    };
  }

  render() {
    let jsxs = this.getJsxs();
    return (
      <div className="page">
        <input type="text" id="input" className={styles.searchInput} ref="input" value={this.state.input} onKeyDown={(e) => { this.onKeyDown(e); }} onChange={(e) => { this.filter(e); }} /><div className={styles.top_icon}>
          <img src="../icon.png" className={styles.top_img} alt="" />
        </div>
        { jsxs }
      </div>
    );
  }

  componentWillMount() {
    let appList = this.getApplicationList();
    this.setState({
      allFiles: appList
    });
    // ipc通信につなぐ
    this.ipcInit();
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
  
  getApplicationList() {
    const path = '/Applications';
    const files = fs.readdirSync(path).filter((file) => {
      // '.app' で終わるファイルのみ
      return file.slice(-4) === '.app';
    }).map((file) => {
      return file.slice(0, -4);
    });
    let appList = files.map((file) => {
      return { name: file, path: path + '/' + file + '.app' };
    });
    return appList;   
  }

  getJsxs() {
    let results = this.state.results;
    let jsxs = results.map((result, i) => {
      let selectFlg = '';
      
      const selectedClassName = (i === this.state.selectedIndex) ? ` ${styles.selected}` : '';
      const listClassName = styles['list-group-item'] + selectedClassName;

      return (
        <div className={listClassName} key={i} onClick={this.onClick.bind(this, i)} onMouseOver={this.onMouseOver.bind(this, i)} >{ result.name }</div>
      );
    });
    return jsxs;
  }
}
