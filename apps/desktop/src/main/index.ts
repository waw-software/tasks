import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, shell } from "electron";
import { resolveWebTarget } from "./web-target";

function createWindow(): void {
	const mainWindow = new BrowserWindow({
		width: 1440,
		height: 900,
		title: "WAW Tasks",
		show: false,
		autoHideMenuBar: true,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	mainWindow.on("ready-to-show", () => {
		mainWindow.show();
	});

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url);
		return { action: "deny" };
	});

	const target = resolveWebTarget({
		isDev: is.dev,
		devUrl: process.env.WAW_WEB_URL,
		appPath: app.getAppPath(),
	});
	if (target.kind === "url") {
		mainWindow.loadURL(target.url);
	} else {
		mainWindow.loadFile(target.path);
	}
}

app.whenReady().then(() => {
	electronApp.setAppUserModelId("software.waw.tasks");

	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
