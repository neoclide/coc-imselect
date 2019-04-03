"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
async function setColor(red, green, blue) {
    let script = `
tell application "iTerm"
  tell current session of current window
    set cursor color to {${red}, ${green}, ${blue}, 0}
  end tell
end tell
`;
    let ps = child_process_1.spawn('osascript', ['-']);
    ps.stdin.write(script);
    ps.stdin.end();
    return new Promise((resolve, reject) => {
        ps.on('exit', code => {
            if (code == 0) {
                resolve();
            }
            else {
                reject(new Error(`abnormal exit with ${code}`));
            }
        });
    });
}
exports.setColor = setColor;
async function getColor() {
    const ps = child_process_1.spawn('osascript', ['-']);
    let content = `
tell application "iTerm"
  tell current session of current window
    get cursor color
  end tell
end tell
`;
    let buffer = Buffer.from('');
    ps.stdout.on('data', buf => {
        buffer = Buffer.concat([buffer, buf]);
    });
    ps.stdin.write(content);
    ps.stdin.end();
    return new Promise((resolve, reject) => {
        ps.on('exit', code => {
            if (code == 0) {
                let str = buffer.toString().trim();
                let parts = str.split(/,\s*/);
                resolve({
                    red: parts[0],
                    green: parts[1],
                    blue: parts[2]
                });
            }
            else {
                reject(new Error(`abnormal exit with ${code}`));
            }
        });
    });
}
exports.getColor = getColor;
async function selectInput(method) {
    let cmd = path_1.default.join(__dirname, '../bin/select');
    await util_1.promisify(child_process_1.exec)(`${cmd} ${method}`);
}
exports.selectInput = selectInput;
//# sourceMappingURL=util.js.map