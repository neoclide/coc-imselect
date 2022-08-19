import { exec } from 'child_process'
import { Disposable, events, ExtensionContext, FloatFactory, StatusBarItem, window, workspace } from 'coc.nvim'
import os from 'os'
import path from 'path'
import { promisify } from 'util'

const method_cache: Map<number, string> = new Map()
let currentMethod: string
let currentLang: string

async function selectInput(method: string): Promise<void> {
  let cmd = path.join(__dirname, '../bin/select')
  await promisify(exec)(`${cmd} ${method}`)
}

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions } = context
  let channel = window.createOutputChannel('imselect')
  subscriptions.push(channel)
  if (os.platform() != 'darwin') {
    channel.appendLine(`[Error] coc-imselect works on mac only.`)
    return
  }
  let { nvim } = workspace
  let config = workspace.getConfiguration('imselect')
  let defaultInput = config.get<string>('defaultInput', 'com.apple.keylayout.US')
  let enableFloating = config.get<boolean>('enableFloating', true)
  let floatFactory = new FloatFactory(nvim)
  let cmd = path.join(__dirname, '../bin/observer')
  let task = workspace.createTask('IMSELECT')
  let statusItem: StatusBarItem
  subscriptions.push(task)
  subscriptions.push(floatFactory)

  let timer: NodeJS.Timer
  task.onStdout(async input => {
    let curr = input[input.length - 1].trim()
    if (!curr) return
    let parts = curr.split(/\s/, 2)
    if (currentLang == parts[0]) return
    currentLang = parts[0]
    currentMethod = parts[1]
    if (timer) clearTimeout(timer)
    if (enableFloating) {
      floatFactory.show([{ content: currentLang, filetype: '' }])
      timer = setTimeout(() => {
        floatFactory.close()
      }, 500)
    }
    // show float buffer
    if (statusItem) {
      statusItem.text = currentLang
    }
  })
  let exitTimer: NodeJS.Timeout
  task.onExit(code => {
    if (code != 0) {
      setTimeout(() => {
        window.showErrorMessage(`imselect observer exit with code ${code}`)
      }, 500)
    }
  })
  let running = await task.running
  if (!running) {
    task.start({
      cmd,
      pty: true
    }).then(() => {
      channel.appendLine(`[Info] Observer for input change started`)
    }, e => {
      channel.appendLine(`[Error] Observer error: ${e.message}`)
    })
  }

  async function selectDefault(): Promise<void> {
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

  subscriptions.push(workspace.registerAutocmd({
    event: 'VimLeavePre',
    request: true,
    callback: selectDefault
  }))

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
    if (timer) clearTimeout(timer)
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
