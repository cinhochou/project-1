import express from 'express'
import https from 'https'
import fs from 'fs'
import path from 'path'

const app = express()

// 1. 托管Vue打包后的dist静态文件
app.use(express.static(path.join(process.cwd(), 'dist')))

// 2. 解决Vue路由History模式刷新404问题（可选，若用Hash模式可删除）
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist/index.html'))
})

// 3. 读取证书（路径需和阿里云服务器上的证书位置一致）
const options = {
  key: fs.readFileSync(path.join(process.cwd(), 'server.key')),
  cert: fs.readFileSync(path.join(process.cwd(), 'server.crt')),
}

// 4. 启动HTTPS服务（443端口，已开放安全组）
const port = 443
https.createServer(options, app).listen(port, () => {
  console.log(`Vue项目HTTPS服务启动成功：https://你的服务器公网IP`)
})
