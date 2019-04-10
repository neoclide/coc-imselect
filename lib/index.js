"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coc_nvim_1 = require("coc.nvim");
const util_1 = require("./util");
const method_cache = new Map();
const isTerm = process.env.TERM_PROGRAM = 'iTerm.app';
let currentMethod;
let currentLang;
let defaultColor;
async function activate(context) {
    let { subscriptions, logger } = context;
    let config = coc_nvim_1.workspace.getConfiguration('imselect');
    let highlights = config.get('cursorHighlight', '65535,65535,0').split(/,\s*/);
    let defaultInput = config.get('defaultInput', 'com.apple.keylayout.US');
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
    async function checkCurrentInput(curr) {
        curr = curr.trim();
        let parts = curr.split(/\s/, 2);
        currentLang = parts[0];
        currentMethod = parts[1];
        if (currentLang == 'en' && isTerm) {
            if (defaultColor) {
                await util_1.setColor(defaultColor.red, defaultColor.green, defaultColor.blue);
            }
        }
        else {
            await util_1.setColor(highlights[0], highlights[1], highlights[2]);
        }
        if (statusItem) {
            statusItem.text = currentLang;
        }
    }
    let { nvim } = coc_nvim_1.workspace;
    nvim.getVar('current_input').then(checkCurrentInput).catch(_e => {
        // noop
    });
    coc_nvim_1.workspace.watchGlobal('current_input', async (_, newValue) => {
        await checkCurrentInput(newValue);
    }, subscriptions);
    if (isTerm) {
        util_1.getColor().then(color => {
            defaultColor = color;
        }, _e => {
            // noop
        });
    }
    subscriptions.push(coc_nvim_1.workspace.registerAutocmd({
        event: 'VimLeavePre',
        request: true,
        callback: selectDefault
    }));
    //   subscriptions.push(workspace.registerAutocmd({
    //     event: 'CmdlineLeave',
    //     request: true,
    //     callback: selectDefault
    //   }))
    coc_nvim_1.events.on('InsertEnter', async () => {
        let { bufnr } = coc_nvim_1.workspace;
        let method = method_cache.get(bufnr);
        if (method && method != currentMethod) {
            await util_1.selectInput(method);
        }
    }, null, subscriptions);
    coc_nvim_1.events.on('FocusGained', async () => {
        let mode = await coc_nvim_1.workspace.nvim.call('mode');
        if (mode == 'n')
            await selectDefault();
    });
    coc_nvim_1.events.on('InsertLeave', async (bufnr) => {
        method_cache.set(bufnr, currentMethod);
        await selectDefault();
    }, null, subscriptions);
    coc_nvim_1.workspace.onDidCloseTextDocument(document => {
        let doc = coc_nvim_1.workspace.getDocument(document.uri);
        if (doc)
            method_cache.delete(doc.bufnr);
    }, null, subscriptions);
}
exports.activate = activate;
//# sourceMappingURL=index.js.map