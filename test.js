const WebSocket = require('ws')
const ws = new WebSocket('ws://127.0.0.1:8080')

ws.on('open', () => console.log('已成功连接到输入法监听后台！'))
ws.on('message', (data) => {
  const status = JSON.parse(data)
  console.log('接收到推送：', status)
})

