const electron = require('electron');
const {app, BrowserWindow, Tray, Menu, ipcMain} = electron;
const path = require('path');
const url = require('url');
const fs = require('fs');

let appPath = path.join(app.getPath('userData'));
try{
  fs.accessSync(appPath);
}catch(e){
  fs.mkdirSync(appPath);
}

let config;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  config = loadConfig();

  if(config){
    createWindow();
    reloadTray();
  }else{
    configure();
  }
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    //app.quit()
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    if(config){
      createWindow();
      reloadTray();
    }else{
      configure();
    }
  }
});

ipcMain.on('getSettings', (event, arg) => {
  event.returnValue = config;
});
ipcMain.on('saveSettings', (event, arg) => {
  fs.writeFileSync(path.join(appPath, 'config.json'), JSON.stringify(arg));
  config = JSON.parse(arg);
});
ipcMain.on('getAppPath', (event, arg) => {
  event.returnValue = appPath;
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.

let configWin;
let win;
let tray;
let isWide = false;
let isTop = true;

function configure(){
  configWin = new BrowserWindow({
    width: 300,
    height: 450,
    center: true
  });
  configWin.loadURL(url.format({
    pathname: path.join(__dirname, 'html/config.html'),
    protocol: 'file:',
    slashes: true
  }));
  configWin.setMenu(null);
  //configWin.webContents.openDevTools();
  // Emitted when the window is closed.
  configWin.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    configWin = null;

    if(!tray){
      app.quit();
    }
    else{
      createWindow();
      reloadTray();
    }
  })
}


function createWindow () {
  const {width: windowWidth, height:windowHeight} = electron.screen.getPrimaryDisplay().workAreaSize;
  // Create the browser window.
  let {width, height} = {width: 200, height: 110};
  if(isWide){
    ({width, height} = {width: 800, height: 500});
  }

  let options = {
    width: width,
    height: height, 
    x: windowWidth - width, 
    y: windowHeight - height, 
    skipTaskbar: true,
    resizable: false,
    alwaysOnTop: isTop,
    show: false
  };
  if(win){
    return;
  }
  win = new BrowserWindow(options);

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'html/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  //win.webContents.openDevTools();
  win.setMenu(null);

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
    reloadTray();
  });
  win.once('ready-to-show', () => {
    win.show();
  });
}

function reloadTray(){
  let menu = [];
  if(!win){
    menu.push({label: 'Open', click: () => {
      if(!win){
        createWindow();
      }
      else{
        win.focus();
      }
      reloadTray();
    }});
  }

  if(!isWide && win && win.isAlwaysOnTop()){
    menu.push({label: '✔️ Disable always on top', click: () => {
      win.setAlwaysOnTop(false);
      reloadTray();
    }});
  }
  else if(!isWide && win && !win.isAlwaysOnTop()){
    menu.push({label: 'Enable always on top', click: () => {
      win.setAlwaysOnTop(true);
      reloadTray();
    }});
  }

  if(win && isWide){
    menu.push({label: 'Disable wide view', click: () => {
      isWide = false;
      win.setSkipTaskbar(true);
      win.setAlwaysOnTop(true);
      win.setSize(200, 110, true);
      reloadTray();
    }});
  }
  else if(win && !isWide){
    menu.push({label: 'Enable wide view', click: () => {
      isWide = true;
      win.setSkipTaskbar(false);
      win.setAlwaysOnTop(false);
      win.setSize(800, 500, true);
      win.center();
      reloadTray();
    }});
  }

  menu.push({label: 'Config', click: () => {
    configure();
  }});

  menu.push({label: 'Exit', click: () => {
    app.quit();
  }});

  contextMenu = Menu.buildFromTemplate(menu);

  if(tray){
    tray.setContextMenu(contextMenu);
  }
  else{
    tray = new Tray(path.join(__dirname,'images/logo.png'));
    tray.setToolTip('Open zyxel giga 2 widget');
    tray.on('click', (e, bounds) => {
      if(!win){
        createWindow();
        reloadTray();
      }
      else{
        win.focus();
      }
    })
    tray.setContextMenu(contextMenu);
  }
}

function loadConfig(){
  let config;
  try{
    config = fs.accessSync(path.join(appPath, 'config.json'));
    config = JSON.parse(fs.readFileSync(path.join(appPath, 'config.json')));
    if(!config.user || !config.password || !config.inetInterface){
      throw 'Wrong config';
    }
  }catch(e){
    config = null;
  }
  return config;
}