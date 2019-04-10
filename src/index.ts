import { events, ExtensionContext, workspace, StatusBarItem } from 'coc.nvim'
import { Color, getColor, selectInput, setColor } from './util'

const method_cache: Map<number, string> = new Map()
const isTerm = process.env.TERM_PROGRAM = 'iTerm.app'

let currentMethod: string
let currentLang: string
let defaultColor: Color

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions, logger } = context
  let config = workspace.getConfiguration('imselect')
  let highlights = config.get<string>('cursorHighlight', '65535,65535,0').split(/,\s*/)
  let defaultInput = config.get<string>('defaultInput', 'com.apple.keylayout.US')

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

  async function checkCurrentInput(curr: string): Promise<void> {
    curr = curr.trim()
    let parts = curr.split(/\s/, 2)
    currentLang = parts[0]
    currentMethod = parts[1]
    if (isTerm) {
      if (currentLang == 'en') {
        if (defaultColor) {
          await setColor(defaultColor.red, defaultColor.green, defaultColor.blue)
        }
      } else {
        await setColor(highlights[0], highlights[1], highlights[2])
      }
    }
    if (statusItem) {
      statusItem.text = currentLang
    }
  }

  let { nvim } = workspace
  nvim.getVar('current_input').then(checkCurrentInput).catch(_e => {
    // noop
  })
  workspace.watchGlobal('current_input', async (_, newValue) => {
    await checkCurrentInput(newValue)
  }, subscriptions)
  if (isTerm) {
    getColor().then(color => {
      defaultColor = color
    }, _e => {
      // noop
    })
  }

  subscriptions.push(workspace.registerAutocmd({
    event: 'VimLeavePre',
    request: true,
    callback: selectDefault
  }))

  //   subscriptions.push(workspace.registerAutocmd({
  //     event: 'CmdlineLeave',
  //     request: true,
  //     callback: selectDefault
  //   }))

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
