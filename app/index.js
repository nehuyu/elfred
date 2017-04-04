import React, { Component } from 'react';
import { render } from 'react-dom';
import Env from './common/env';
import App from './components/App';

render(
  <App />,
  document.getElementById('root')
);

// Disable Zoom.
let webFrame = window.require('electron').webFrame;
webFrame.setZoomLevelLimits(1, 1);

console.deka = (string) => {
  let option = 'font-size: 40px; font-weight: bold; color: #FF8E8E;';
  console.log('%c' + string, option);
};
console.deka(Env.envName);
