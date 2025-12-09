console.log("Test starting...");
const { app, BrowserWindow } = require("electron");
console.log("Electron loaded");
app.whenReady().then(() => {
  console.log("App ready");
  const win = new BrowserWindow({width: 400, height: 300});
  win.loadURL("data:text/html,<h1>Hello</h1>");
});
