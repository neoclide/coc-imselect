import { events, FloatFactory, ExtensionContext, StatusBarItem, workspace } from 'coc.nvim'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const method_cache: Map<number, string> = new Map()
let currentMethod: string
let currentLang: string

async function selectInput(method: string): Promise<void> {
  let cmd = path.join(__dirname, '../bin/select')
  await promisify(exec)(`${cmd} ${method}`)
}

export async function activate(context: ExtensionContext): Promise<void> {
  if (os.platform() != 'darwin') return
  let { subscriptions, logger } = context
  let { nvim } = workspace
  let config = workspace.getConfiguration('imselect')
  let defaultInput = config.get<string>('defaultInput', 'com.apple.keylayout.US')
  let enableFloating = config.get<boolean>('enableFloating', true)
  let floatFactory = new FloatFactory(nvim, workspace.env, true, 1, 100, true)
  let cmd = path.join(__dirname, '../bin/observer')
  let task = workspace.createTask('IMSELECT')
  let statusItem: StatusBarItem
  subscriptions.push(task)

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
      floatFactory.create([{ content: currentLang, filetype: '' }], false, 0).catch(e => {
        logger.error(e)
      })
      timer = setTimeout(() => {
        floatFactory.close()
      }, 500)
    }
    // show float buffer
    if (statusItem) {
      statusItem.text = currentLang
    }
  })
  task.onExit(code => {
    if (code != 0) {
      workspace.showMessage(`imselect observer exit with code ${code}`)
    }
  })
  task.start({
    cmd,
    pty: true
  }).then(() => {
    logger.info('Observer for input change started')
  }, e => {
    logger.error(e)
  })

  async function selectDefault(): Promise<void> {
    try {
      await selectInput(defaultInput)
    } catch (e) {
      logger.error(e.message)
    }
  }

  if (config.get<boolean>('enableStatusItem', true)) {
    statusItem = workspace.createStatusBarItem(0)
    statusItem.text = ''
    statusItem.show()
  }

  subscriptions.push(workspace.registerAutocmd({
    event: 'VimLeavePre',
    request: true,
    callback: selectDefault
  }))

  // subscriptions.push(workspace.registerAutocmd({
  //   event: 'CmdlineLeave',
  //   request: false,
  //   callback: async () => {
  //     let m = await workspace.nvim.mode
  //     if (m.blocking) return
  //     if (m.mode.startsWith('n')) await selectDefault()
  //   }
  // }))

  events.on('InsertEnter', async () => {
    let { bufnr } = workspace
    let method = method_cache.get(bufnr)
    if (method && method != currentMethod) {
      await selectInput(method)
    }
  }, null, subscriptions)

  events.on('FocusGained', async () => {
    let mode = await workspace.nvim.call('mode') as string
    if (mode.startsWith('n')) await selectDefault()
  })

  events.on('InsertLeave', async bufnr => {
    method_cache.set(bufnr, currentMethod)
    setTimeout(async () => {
      let mode = await workspace.nvim.call('mode') as string
      if (mode.startsWith('n')) await selectDefault()
    }, 50)
  }, null, subscriptions)

  workspace.onDidCloseTextDocument(document => {
    let doc = workspace.getDocument(document.uri)
    if (doc) method_cache.delete(doc.bufnr)
  }, null, subscriptions)
}
