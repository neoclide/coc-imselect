import { events, ExtensionContext, workspace, StatusBarItem } from 'coc.nvim'
import path from 'path'
import { Color, getColor, selectInput, setColor } from './util'
const pty = require('node-pty')

const method_cache: Map<number, string> = new Map()

let defaultInput = 'com.apple.keylayout.US'
let currentMethod: string
let currentLang: string
let defaultColor: Color

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions, logger } = context
  let config = workspace.getConfiguration('imselect')
  let highlights = config.get<string>('cursorHighlight', '65535,65535,0').split(/,\s*/)

  async function selectDefault(): Promise<void> {
    if (currentLang == 'en') return
    try {
      await selectInput(defaultInput)
    } catch (e) {
      logger.error(e.message)
    }
  }
  let statusItem: StatusBarItem

  if (config.get<boolean>('enableStatusItem', true)) {
    statusItem = workspace.createStatusBarItem(0)
    statusItem.text = ''
    statusItem.show()
  }

  let cmd = path.join(__dirname, '../bin/observer')
  let cp = pty.spawn(cmd, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    env: process.env
  })

  cp.on('data', async line => {
    line = line.trim()
    let parts = line.split(/\s/, 2)
    currentLang = parts[0]
    currentMethod = parts[1]
    if (currentLang == 'en') {
      if (defaultColor) {
        await setColor(defaultColor.red, defaultColor.green, defaultColor.blue)
      }
    } else {
      await setColor(highlights[0], highlights[1], highlights[2])
    }
    if (statusItem) {
      statusItem.text = currentLang
    }
  })

  cp.on('exit', code => {
    if (code != 0) {
      workspace.showMessage(`imselect observer exited with ${code}`)
    }
  })

  getColor().then(color => {
    defaultColor = color
  })

  subscriptions.push({
    dispose: () => {
      cp.kill()
    }
  })

  subscriptions.push(workspace.registerAutocmd({
    event: 'VimLeavePre',
    request: true,
    callback: selectDefault
  }))

  subscriptions.push(workspace.registerAutocmd({
    event: 'CmdlineLeave',
    request: true,
    callback: selectDefault
  }))

  events.on('InsertEnter', async () => {
    let { bufnr } = workspace
    let method = method_cache.get(bufnr)
    if (method && method != currentMethod) {
      await selectInput(method)
    }
  }, null, subscriptions)

  events.on('FocusGained', async () => {
    let mode = await workspace.nvim.call('mode')
    if (mode == 'n') await selectDefault()
  })

  events.on('InsertLeave', async bufnr => {
    method_cache.set(bufnr, currentMethod)
    await selectDefault()
  }, null, subscriptions)

  workspace.onDidCloseTextDocument(document => {
    let doc = workspace.getDocument(document.uri)
    if (doc) method_cache.delete(doc.bufnr)
  }, null, subscriptions)
}
