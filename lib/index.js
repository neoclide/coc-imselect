"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const coc_nvim_1 = require("coc.nvim");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const os_1 = __importDefault(require("os"));
const method_cache = new Map();
let currentMethod;
let currentLang;
async function selectInput(method) {
    let cmd = path_1.default.join(__dirname, '../bin/select');
    await util_1.promisify(child_process_1.exec)(`${cmd} ${method}`);
}
async function activate(context) {
    if (os_1.default.platform() != 'darwin')
        return;
    let { subscriptions, logger } = context;
    let { nvim } = coc_nvim_1.workspace;
    let config = coc_nvim_1.workspace.getConfiguration('imselect');
    let defaultInput = config.get('defaultInput', 'com.apple.keylayout.US');
    let floatFactory = new coc_nvim_1.FloatFactory(nvim, coc_nvim_1.workspace.env, true, 1, 100, true);
    let cmd = path_1.default.join(__dirname, '../bin/observer');
    let task = coc_nvim_1.workspace.createTask('IMSELECT');
    let statusItem;
    subscriptions.push(task);
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
        floatFactory.create([{ content: currentLang, filetype: '' }], false, 0).catch(e => {
            logger.error(e);
        });
        timer = setTimeout(() => {
            floatFactory.close();
        }, 500);
        // show float buffer
        if (statusItem) {
            statusItem.text = currentLang;
        }
    });
    task.onExit(code => {
        if (code != 0) {
            coc_nvim_1.workspace.showMessage(`imselect observer exit with code ${code}`);
        }
    });
    task.start({
        cmd,
        pty: true
    }).then(() => {
        logger.info('Observer for input change started');
    }, e => {
        logger.error(e);
    });
    async function selectDefault() {
        if (currentLang == 'en')
            return;
        try {
            await selectInput(defaultInput);
        }
        catch (e) {
            logger.error(e.message);
        }
    }
    if (config.get('enableStatusItem', true)) {
        statusItem = coc_nvim_1.workspace.createStatusBarItem(0);
        statusItem.text = '';
        statusItem.show();
    }
    subscriptions.push(coc_nvim_1.workspace.registerAutocmd({
        event: 'VimLeavePre',
        request: true,
        callback: selectDefault
    }));
    // subscriptions.push(workspace.registerAutocmd({
    //   event: 'CmdlineLeave',
    //   request: false,
    //   callback: async () => {
    //     let m = await workspace.nvim.mode
    //     if (m.blocking) return
    //     if (m.mode.startsWith('n')) await selectDefault()
    //   }
    // }))
    coc_nvim_1.events.on('InsertEnter', async () => {
        let { bufnr } = coc_nvim_1.workspace;
        let method = method_cache.get(bufnr);
        if (method && method != currentMethod) {
            await selectInput(method);
        }
    }, null, subscriptions);
    coc_nvim_1.events.on('FocusGained', async () => {
        let mode = await coc_nvim_1.workspace.nvim.call('mode');
        if (mode.startsWith('n'))
            await selectDefault();
    });
    coc_nvim_1.events.on('InsertLeave', async (bufnr) => {
        method_cache.set(bufnr, currentMethod);
        setTimeout(async () => {
            let mode = await coc_nvim_1.workspace.nvim.call('mode');
            if (mode.startsWith('n'))
                await selectDefault();
        }, 50);
    }, null, subscriptions);
    coc_nvim_1.workspace.onDidCloseTextDocument(document => {
        let doc = coc_nvim_1.workspace.getDocument(document.uri);
        if (doc)
            method_cache.delete(doc.bufnr);
    }, null, subscriptions);
}
exports.activate = activate;
//# sourceMappingURL=index.js.map