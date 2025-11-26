import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0', // 关键！允许外部设备访问
    port: 8080,
    open: true,
    cors: true,
    // 添加允许的主机列表，包含ngrok生成的域名
    allowedHosts: ['kraig-scarabaeiform-zealously.ngrok-free.dev', 'myar.nat123.top'],
    // 添加代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:8081', // 后端API地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // 可选：移除路径中的/api前缀
      },
      '/tfjs-models': {
        target: 'https://storage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tfjs-models/, '/tfjs-models'),
      },
    },
  },
  plugins: [
    vue(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
        },
      ],
    }),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
  ],
  optimizeDeps: {
    include: ['@tensorflow/tfjs', '@tensorflow-models/coco-ssd'],
  },
})
