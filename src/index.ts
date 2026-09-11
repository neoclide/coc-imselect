import { exec } from 'child_process'
import { Disposable, events, ExtensionContext, StatusBarItem, window, workspace } from 'coc.nvim'
import path from 'path'
import WebSocket from 'ws'
import { promisify } from 'util'

const method_cache: Map<number, string> = new Map()
let currentMethod: string
let currentLang: string

async function selectInput(method: string): Promise<void> {
  let cmd = path.join(__dirname, '../bin/select')
  await promisify(exec)(`${cmd} ${method}`)
}

export async function activate(context: ExtensionContext): Promise<void> {
  const ws = new WebSocket('ws://127.0.0.1:8088')
  let channel = window.createOutputChannel('imselect')
  let { subscriptions } = context
  subscriptions.push(channel)
  let config = workspace.getConfiguration('imselect')
  let defaultInput = config.get<string>('defaultInput', 'com.apple.keylayout.US')
  let connected = false
  ws.on('open', () => {
    connected = true
    channel.appendLine(`[Info] Socket connected.`)
  })
  ws.on('error', (error: Error) => {
    connected = false
    channel.appendLine(`[Error] Socket error: ${error.message}`)
  })
  let timer
  ws.on('close', () => {
    connected = false
    timer = setTimeout(() => {
      window.showErrorMessage(`imselect socket disconnected.`)
      channel.appendLine(`[Info] Socket closed.`)
    }, 100)
  })

  subscriptions.push({
    dispose: () => {
      connected = false
      clearTimeout(timer)
      ws.terminate()
    }
  })
  process.on('exit', () => {
    ws.terminate()
  })
  ws.on('message', (data) => {
    const status = JSON.parse(data)
    currentMethod = status.sourceID
    currentLang = status.isChinese ? 'zh-CN' : 'en-US'
    if (statusItem) {
      statusItem.text = currentLang
    }
  })
  let statusItem: StatusBarItem

  let exitTimer: NodeJS.Timeout
  async function selectDefault(): Promise<void> {
    if (currentLang === 'en-US') return
    try {
      await selectInput(defaultInput)
    } catch (e) {
      window.showErrorMessage(`Error on select input method: ${e.message}`)
    }
  }

  if (config.get<boolean>('enableStatusItem', true)) {
    statusItem = window.createStatusBarItem(0)
    statusItem.text = ''
    statusItem.show()
  }

  // subscriptions.push(workspace.registerAutocmd({
  //   event: 'VimLeavePre',
  //   request: true,
  //   callback: selectDefault
  // }))

  let timeout: NodeJS.Timeout
  events.on('InsertEnter', async (bufnr) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      if (events.insertMode && workspace.bufnr == bufnr) {
        let method = method_cache.get(bufnr)
        if (method && method != currentMethod) {
          void selectInput(method)
        }
      }
    }, 50)
  }, null, subscriptions)

  events.on('InsertLeave', async bufnr => {
    if (timeout) clearTimeout(timeout)
    method_cache.set(bufnr, currentMethod)
    timeout = setTimeout(async () => {
      if (!events.insertMode) {
        void selectDefault()
      }
    }, 50)
  }, null, subscriptions)

  subscriptions.push(Disposable.create(() => {
    if (timeout) clearTimeout(timeout)
    if (exitTimer) clearTimeout(exitTimer)
  }))

  events.on('FocusGained', async () => {
    if (!events.insertMode) await selectDefault()
  })

  workspace.onDidCloseTextDocument(document => {
    let doc = workspace.getDocument(document.uri)
    if (doc) method_cache.delete(doc.bufnr)
  }, null, subscriptions)
}
