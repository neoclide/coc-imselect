"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const child_process_1 = require("child_process");
const coc_nvim_1 = require("coc.nvim");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const method_cache = new Map();
let currentMethod;
let currentLang;
async function selectInput(method) {
    let cmd = path_1.default.join(__dirname, '../bin/select');
    await util_1.promisify(child_process_1.exec)(`${cmd} ${method}`);
}
async function activate(context) {
    let { subscriptions } = context;
    let channel = coc_nvim_1.window.createOutputChannel('imselect');
    subscriptions.push(channel);
    if (os_1.default.platform() != 'darwin') {
        channel.appendLine(`[Error] coc-imselect works on mac only.`);
        return;
    }
    let { nvim } = coc_nvim_1.workspace;
    let config = coc_nvim_1.workspace.getConfiguration('imselect');
    let defaultInput = config.get('defaultInput', 'com.apple.keylayout.US');
    let enableFloating = config.get('enableFloating', true);
    let floatFactory = new coc_nvim_1.FloatFactory(nvim);
    let cmd = path_1.default.join(__dirname, '../bin/observer');
    let task = coc_nvim_1.workspace.createTask('IMSELECT');
    let statusItem;
    subscriptions.push(task);
    subscriptions.push(floatFactory);
    let timer;
    task.onStdout(async (input) => {
        let curr = input[input.length - 1].trim();
        if (!curr)
            return;
        let parts = curr.split(/\s/, 2);
        if (currentLang == parts[0])
            return;
        currentLang = parts[0];
        currentMethod = parts[1];
        if (timer)
            clearTimeout(timer);
        if (enableFloating) {
            floatFactory.show([{ content: currentLang, filetype: '' }]);
            timer = setTimeout(() => {
                floatFactory.close();
            }, 500);
        }
        // show float buffer
        if (statusItem) {
            statusItem.text = currentLang;
        }
    });
    let exitTimer;
    task.onExit(code => {
        if (code != 0) {
            setTimeout(() => {
                coc_nvim_1.window.showErrorMessage(`imselect observer exit with code ${code}`);
            }, 500);
        }
    });
    let running = await task.running;
    if (!running) {
        task.start({
            cmd,
            pty: true
        }).then(() => {
            channel.appendLine(`[Info] Observer for input change started`);
        }, e => {
            channel.appendLine(`[Error] Observer error: ${e.message}`);
        });
    }
    async function selectDefault() {
        try {
            await selectInput(defaultInput);
        }
        catch (e) {
            coc_nvim_1.window.showErrorMessage(`Error on select input method: ${e.message}`);
        }
    }
    if (config.get('enableStatusItem', true)) {
        statusItem = coc_nvim_1.window.createStatusBarItem(0);
        statusItem.text = '';
        statusItem.show();
    }
    // subscriptions.push(workspace.registerAutocmd({
    //   event: 'VimLeavePre',
    //   request: true,
    //   callback: selectDefault
    // }))
    let timeout;
    coc_nvim_1.events.on('InsertEnter', async (bufnr) => {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (coc_nvim_1.events.insertMode && coc_nvim_1.workspace.bufnr == bufnr) {
                let method = method_cache.get(bufnr);
                if (method && method != currentMethod) {
                    void selectInput(method);
                }
            }
        }, 50);
    }, null, subscriptions);
    coc_nvim_1.events.on('InsertLeave', async (bufnr) => {
        if (timeout)
            clearTimeout(timeout);
        method_cache.set(bufnr, currentMethod);
        timeout = setTimeout(async () => {
            if (!coc_nvim_1.events.insertMode) {
                void selectDefault();
            }
        }, 50);
    }, null, subscriptions);
    subscriptions.push(coc_nvim_1.Disposable.create(() => {
        if (timer)
            clearTimeout(timer);
        if (timeout)
            clearTimeout(timeout);
        if (exitTimer)
            clearTimeout(exitTimer);
    }));
    coc_nvim_1.events.on('FocusGained', async () => {
        if (!coc_nvim_1.events.insertMode)
            await selectDefault();
    });
    coc_nvim_1.workspace.onDidCloseTextDocument(document => {
        let doc = coc_nvim_1.workspace.getDocument(document.uri);
        if (doc)
            method_cache.delete(doc.bufnr);
    }, null, subscriptions);
}
exports.activate = activate;
//# sourceMappingURL=index.js.map