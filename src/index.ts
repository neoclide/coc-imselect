import { events, FloatFactory, ExtensionContext, StatusBarItem, workspace } from 'coc.nvim'
import { Color, selectInput } from './util'

const method_cache: Map<number, string> = new Map()
let currentMethod: string
let currentLang: string

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions, logger } = context
  let config = workspace.getConfiguration('imselect')
  let highlights = config.get<string>('cursorHighlight', '65535,65535,0').split(/,\s*/)
  let defaultInput = config.get<string>('defaultInput', 'com.apple.keylayout.US')
  let floatFactory = new FloatFactory(workspace.nvim, workspace.env, true, 1, 100, true)

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

  let timer: NodeJS.Timer
  async function checkCurrentInput(): Promise<void> {
    let curr = await nvim.getVar('current_input') as string
    if (!curr) return
    curr = curr.trim()
    let parts = curr.split(/\s/, 2)
    if (currentLang == parts[0]) return
    currentLang = parts[0]
    currentMethod = parts[1]
    if (timer) clearTimeout(timer)
    await floatFactory.create([{ content: currentLang, filetype: '' }], false, 0)
    timer = setTimeout(() => {
      floatFactory.close()
    }, 500)
    // show float buffer
    if (statusItem) {
      statusItem.text = currentLang
    }
  }

  let { nvim } = workspace
  checkCurrentInput().catch(_e => {
    // noop
  })

  subscriptions.push(workspace.registerAutocmd({
    event: 'User CocInputMethodChange',
    request: false,
    callback: checkCurrentInput
  }))

  subscriptions.push(workspace.registerAutocmd({
    event: 'VimLeavePre',
    request: true,
    callback: selectDefault
  }))

  subscriptions.push(workspace.registerAutocmd({
    event: 'CmdlineLeave',
    request: false,
    callback: async () => {
      let mode = await workspace.nvim.call('mode') as string
      if (mode.startsWith('n')) await selectDefault()
    }
  }))

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
    }, 20)
  }, null, subscriptions)

  workspace.onDidCloseTextDocument(document => {
    let doc = workspace.getDocument(document.uri)
    if (doc) method_cache.delete(doc.bufnr)
  }, null, subscriptions)
}
