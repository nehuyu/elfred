import electron, { app, BrowserWindow, Menu, shell, crashReporter, ipcMain, Tray, globalShortcut } from 'electron';

import rmdir from 'rimraf';
import { LIST, INPUT } from './app/common/constants';
import fs from 'fs';

const path = require('path');

const iconPath = path.join(__dirname, 'icon.png');

let mainWindow = null;
let tray = null;

app.dock.hide();

const plist = fs.readFileSync('/Applications/safari.app/contents/info.plist', 'utf-8');
if (process.env.NODE_ENV === 'development') {
  require('electron-debug')();  // eslint-disable-line global-require
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('ready', () => {
  
  //ウインドウの位置を揃える処理
  const screenElectron = electron.screen;
  const mainScreen = screenElectron.getPrimaryDisplay();
  const screenSize = mainScreen.size;
  
  // ウインドウの縦の最長の長さ
  const maxHeight = INPUT.HEIGHT + LIST.HEIGHT * LIST.LENGTH;
  
  mainWindow = new BrowserWindow({
    width: INPUT.WIDTH,
    height: INPUT.HEIGHT,
    x: Math.floor((screenSize.width - INPUT.WIDTH) / 2),
    y: Math.floor((screenSize.height - maxHeight) / 2),
    transparent: true,
    show: false,
    frame: false,
    resizable: true
  });

  mainWindow.loadURL(`file://${__dirname}/app/app.html`);
  
  const hideWindow = () => {
    // 閉じた事を通知
    mainWindow.webContents.send('mainWindowHide');
    // windowの高さリセット
    mainWindow.setSize(INPUT.WIDTH, INPUT.HEIGHT);
    mainWindow.hide();
  };

  const showWindow = () => {
    mainWindow.show();
    mainWindow.webContents.send('mainWindowShow');  
  };

  mainWindow.toggle = () => {
    if (mainWindow.isVisible()) {
      hideWindow();
    } else {
      showWindow();  
    }
  };
  
  mainWindow.on('blur', () => {
    hideWindow();
  });
 
  globalShortcut.register('Command+Space+Shift', () => { 
    mainWindow.toggle();
  });
  
  tray = new Tray(iconPath);
  let contextMenu = Menu.buildFromTemplate([
    {
      label: 'Item1',
      type: 'radio',
      icon: iconPath
    },
    {
      label: 'Item2',
      submenu: [
        { label: 'subMenu1' },
        { label: 'subMenu2' }
      ]
    },
    {
      lebel: 'fuga',
      type: 'radio',
      checked: true
    },
    {
      label: 'Quit',
      accelerater: 'Command+Q',
      selector: 'terminate:'
    }
  ]);
  tray.setToolTip('hey.');
  tray.setContextMenu(contextMenu);

   // if (process.env.NODE_ENV === 'development') {
  mainWindow.openDevTools();
  // } 

  // アプリケーションを quit する
  ipcMain.on('app-quit', function (event) {
    app.quit();
  });

  
  ipcMain.on('inputChange', function (event, message) {
    // 入力フォームの高さ63、 messageの高さ58からサイズ算出
    const newHeight = INPUT.HEIGHT + message * LIST.HEIGHT;
    mainWindow.setSize(INPUT.WIDTH, newHeight);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.focus();
  });

  mainWindow.on('close', () => {
    mainWindow = null;
    // mainが閉じたら本体プロセスも終了するように
    app.quit();
  });

  if (process.platform === 'darwin') {
  // Mac の場合
  } else {
  // それ以外
  }    
});
