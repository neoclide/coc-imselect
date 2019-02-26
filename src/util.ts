import { spawn, exec } from 'child_process'
import path from 'path'
import { promisify } from 'util'

export interface Color {
  red: string
  green: string
  blue: string
}

export async function setColor(red: string, green: string, blue: string): Promise<void> {
  let script = `
tell application "iTerm"
  tell current session of current window
    set cursor color to {${red}, ${green}, ${blue}, 0}
  end tell
end tell
`
  let ps = spawn('osascript', ['-'])
  ps.stdin.write(script)
  ps.stdin.end()
  return new Promise((resolve, reject) => {
    ps.on('exit', code => {
      if (code == 0) {
        resolve()
      } else {
        reject(new Error(`abnormal exit with ${code}`))
      }
    })
  })
}

export async function getColor(): Promise<Color> {
  const ps = spawn('osascript', ['-'])
  let content = `
tell application "iTerm"
  tell current session of current window
    get cursor color
  end tell
end tell
`
  let buffer = Buffer.from('')
  ps.stdout.on('data', buf => {
    buffer = Buffer.concat([buffer, buf])
  })
  ps.stdin.write(content)
  ps.stdin.end()
  return new Promise((resolve, reject) => {
    ps.on('exit', code => {
      if (code == 0) {
        let str = buffer.toString().trim()
        let parts = str.split(/,\s*/)
        resolve({
          red: parts[0],
          green: parts[1],
          blue: parts[2]
        })
      } else {
        reject(new Error(`abnormal exit with ${code}`))
      }
    })
  })
}

export async function selectInput(method: string): Promise<void> {
  let cmd = path.join(__dirname, '../bin/select')
  await promisify(exec)(`${cmd} ${method}`)
}
