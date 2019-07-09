"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coc_nvim_1 = require("coc.nvim");
const util_1 = require("./util");
const method_cache = new Map();
let currentMethod;
let currentLang;
async function activate(context) {
    let { subscriptions, logger } = context;
    let config = coc_nvim_1.workspace.getConfiguration('imselect');
    let highlights = config.get('cursorHighlight', '65535,65535,0').split(/,\s*/);
    let defaultInput = config.get('defaultInput', 'com.apple.keylayout.US');
    let floatFactory = new coc_nvim_1.FloatFactory(coc_nvim_1.workspace.nvim, coc_nvim_1.workspace.env, true, 1, 100, true);
    async function selectDefault() {
        if (currentLang == 'en')
            return;
        try {
            await util_1.selectInput(defaultInput);
        }
        catch (e) {
            logger.error(e.message);
        }
    }
    let statusItem;
    if (config.get('enableStatusItem', true)) {
        statusItem = coc_nvim_1.workspace.createStatusBarItem(0);
        statusItem.text = '';
        statusItem.show();
    }
    let timer;
    async function checkCurrentInput() {
        let curr = await nvim.getVar('current_input');
        if (!curr)
            return;
        curr = curr.trim();
        let parts = curr.split(/\s/, 2);
        if (currentLang == parts[0])
            return;
        currentLang = parts[0];
        currentMethod = parts[1];
        if (timer)
            clearTimeout(timer);
        await floatFactory.create([{ content: currentLang, filetype: '' }], false, 0);
        timer = setTimeout(() => {
            floatFactory.close();
        }, 500);
        // show float buffer
        if (statusItem) {
            statusItem.text = currentLang;
        }
    }
    let { nvim } = coc_nvim_1.workspace;
    checkCurrentInput().catch(_e => {
        // noop
    });
    subscriptions.push(coc_nvim_1.workspace.registerAutocmd({
        event: 'User CocInputMethodChange',
        request: false,
        callback: checkCurrentInput
    }));
    subscriptions.push(coc_nvim_1.workspace.registerAutocmd({
        event: 'VimLeavePre',
        request: true,
        callback: selectDefault
    }));
    subscriptions.push(coc_nvim_1.workspace.registerAutocmd({
        event: 'CmdlineLeave',
        request: false,
        callback: async () => {
            let mode = await coc_nvim_1.workspace.nvim.call('mode');
            if (mode.startsWith('n'))
                await selectDefault();
        }
    }));
    coc_nvim_1.events.on('InsertEnter', async () => {
        let { bufnr } = coc_nvim_1.workspace;
        let method = method_cache.get(bufnr);
        if (method && method != currentMethod) {
            await util_1.selectInput(method);
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
        }, 20);
    }, null, subscriptions);
    coc_nvim_1.workspace.onDidCloseTextDocument(document => {
        let doc = coc_nvim_1.workspace.getDocument(document.uri);
        if (doc)
            method_cache.delete(doc.bufnr);
    }, null, subscriptions);
}
exports.activate = activate;
//# sourceMappingURL=index.js.map