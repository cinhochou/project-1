<template>
  <div id="app">
    <div id="ar_container">
      <div
        class="video-container"
        style="position: relative; width: 100%; height: 100%; margin: 0 auto"
      >
        <video
          ref="videoRef"
          autoplay
          playsinline
          muted
          class="video-element"
          id="videoElement"
          @click="handleVideoClick"
        ></video>
        <canvas ref="canvasRef" id="canvas" />
        <div
          style="
            position: absolute;
            top: 2%;
            left: 2%;
            background-color: rgba(0, 0, 0, 0.1);
            color: white;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 4px;
            z-index: 999;
          "
        >
          <div id="status" style="display: flex; align-items: center; padding: 5px">
            <span>{{ statusText }}</span>
          </div>
          <div class="fps-container" style="display: flex; align-items: center; padding: 5px">
            <span>帧率:</span>
            <span id="fpsCounter">0 FPS</span>
          </div>
        </div>
      </div>
    </div>
    <div id="operations_div">
      <h1 style="margin-left: 10%; position: absolute">操作面板</h1>
      <p style="display: flex; margin-left: 10%; margin-top: 30%">
        <a>模型选择：</a>
        <n-select
          :options="optionsRef"
          :reset-menu-on-options-change="false"
          @scroll="handleScroll"
          placeholder="请选择一个3d模型"
          style="width: 60%; margin-left: 20%; position: absolute"
          @update:value="addmodel"
        />
      </p>
      <div id="controls_div"></div>
      <n-button
        @click="isCameraOn ? stopCamera() : startCamera()"
        :type="isCameraOn ? 'error' : 'success'"
        id="cameraButton"
      >
        {{ isCameraOn ? '关闭摄像头' : '打开摄像头' }}
      </n-button>
      <!-- <div id="output"></div> -->
    </div>
  </div>
</template>

<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { onMounted, ref } from 'vue'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'

const videoRef = ref<HTMLVideoElement | null>(null)
const isCameraOn = ref<boolean>(false)
let stream: MediaStream | null = null
const is3dModel = ref<boolean>(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDetecting = ref(false)
const statusText = ref('未启动')
const fpsCounter = ref<HTMLElement | null>(null)
const optionsRef = ref([
  { label: '立方体', value: 'cube' },
  { label: '球体', value: 'sphere' },
  { label: '圆柱体', value: 'cylinder' },
])

// 用于计算帧率的时间戳
let lastFrameTime = 0
// 帧数计数器
let frameCount = 0
// 帧率
let fps = 0
// 检测到的所有对象
let detectedObjects = []

const detectedPlanes = ref<cocoSsd.DetectedObject[]>([])

function handleVideoClick() {
  if (videoRef.value && videoRef.value.paused) {
    videoRef.value.play().catch((err) => {
      console.error('播放失败:', err)
    })
  }
}
// 当前清理函数（用于移除旧模型资源）
let currentCleanup = () => {}

// 滚动加载更多
function handleScroll(e: Event) {
  const target = e.currentTarget as HTMLElement
  if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 5) {
    optionsRef.value.push({
      label: `占位项-${optionsRef.value.length}`,
      value: `placeholder-${optionsRef.value.length}`,
    })
  }
}

function selectModel(model: string): THREE.Mesh | null {
  console.log('尝试创建模型:', model)
  let geometry: THREE.BufferGeometry
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.6,
  })

  switch (model) {
    case 'cube':
      geometry = new THREE.BoxGeometry(5, 5, 5)
      break
    case 'sphere':
      geometry = new THREE.SphereGeometry(5, 32, 32)
      break
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(5, 5, 10, 32)
      break
    default:
      console.warn('未知模型类型:', model)
      return null
  }

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = 0 // 对齐“地面”
  return mesh
}

function removeModel() {
  if (!is3dModel.value) return
  currentCleanup() // 执行注册的清理逻辑
}

async function addmodel(model: string) {
  console.log('addmodel 被调用，目标模型:', model)

  // 如果已有模型，先移除
  if (is3dModel.value) {
    removeModel()
  }

  if (!videoRef.value) {
    console.warn('视频元素未就绪')
    return
  }

  const videoContainer = document.querySelector('.video-container') as HTMLElement
  if (!videoContainer) {
    console.error('找不到 .video-container 容器')
    return
  }

  const width = videoContainer.clientWidth
  const height = videoContainer.clientHeight

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
  })
  renderer.setClearColor(0x000000, 0) // 完全透明底色
  renderer.domElement.classList.add('three-renderer')

  // 设置样式（确保和视频完全对齐）
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    zIndex: '20',
    width: '100%',
    height: '100%',
  })

  // 插入到容器中（覆盖在视频之上）
  videoContainer.appendChild(renderer.domElement)

  camera.position.set(2, 20, 10)
  camera.lookAt(0, 0, 0)

  const mesh = selectModel(model)
  if (!mesh) return
  scene.add(mesh)

  const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc)
  gridHelper.position.y = -4.5 // 放在模型下方
  scene.add(gridHelper)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // --- 动画循环 ---
  let animId: number | null = null
  const animate = () => {
    if (!isCameraOn.value) return
    animId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  // 自适应窗口缩放
  const handleResize = () => {
    const w = videoContainer.clientWidth
    const h = videoContainer.clientHeight

    // 更新相机
    camera.aspect = w / h
    camera.updateProjectionMatrix()

    // 更新渲染器
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
  }

  // 初始执行一次
  handleResize()

  // 监听窗口变化
  window.addEventListener('resize', handleResize)

  // 注册清理函数
  currentCleanup = () => {
    // 取消动画
    if (animId !== null) {
      cancelAnimationFrame(animId)
      animId = null
    }
    controls.dispose()
    // 移除事件监听
    window.removeEventListener('resize', handleResize)

    // 移除 DOM
    if (renderer.domElement.parentNode === videoContainer) {
      videoContainer.removeChild(renderer.domElement)
    }

    // 释放资源
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = (obj as THREE.Mesh).material as THREE.Material
        if (Array.isArray(m)) {
          m.forEach((mat) => mat.dispose())
        } else {
          m.dispose()
        }
        ;(obj as THREE.Mesh).geometry.dispose()
      }
    })

    // 标记状态
    is3dModel.value = false

    console.log('3D模型已成功清除')
  }

  //最后才标记为“有模型”
  is3dModel.value = true

  console.log(` ${model} 模型加载完成`)
}

// 打开摄像头
async function startCamera() {
  if (isCameraOn.value) return

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('浏览器不支持摄像头，请使用 Chrome/Safari/Edge')
    return
  }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const constraints: MediaStreamConstraints = {
    video: isMobile
      ? {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        }
      : true,
    audio: false,
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints)
    isCameraOn.value = true
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      // await aiDetect()
      await startPlanesDetect()
    }
  } catch (err) {
    console.error('无法访问摄像头:', err)
    alert('请允许摄像头权限')
  }
}

// 关闭摄像头
function stopCamera() {
  if (!isCameraOn.value) return
  if (!stream) return

  // 先移除3D模型
  if (is3dModel.value) {
    removeModel()
  }

  // 停止所有轨道
  stream.getTracks().forEach((track) => track.stop())
  stream = null
  isCameraOn.value = false
  isDetecting.value = false
  statusText.value = '未启动'
  // 清除视频画面
  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.srcObject = null
  }

  // 清除canvas画布
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    }
  }
  const outputDiv = document.getElementById('output')
  if (outputDiv) {
    outputDiv.innerHTML = ''
  }
  if (fpsCounter.value) {
    fpsCounter.value.textContent = '0 FPS'
  }
  console.log('摄像头已关闭')
}

async function aiDetect() {
  const video = videoRef.value
  if (isDetecting.value) return
  statusText.value = '加载模型中...'
  const model = await cocoSsd.load()

  if (!video || !model) return
  console.log('开始目标检测')
  isDetecting.value = true
  let lastTime = performance.now() // 上一帧时间

  // 1. 新增：帧率计算用的累计器（每秒更新用）
  let fpsTimeAccumulator = 0 // 累计时间（毫秒）
  let fpsFrameAccumulator = 0 // 累计帧数

  const detectFrame = async () => {
    if (!isDetecting.value || !isCameraOn.value) return

    // 2. 计算当前帧与上一帧的时间差
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTime
    lastTime = currentTime

    // 3. 累计时间和帧数（每帧都累加，但不立即更新）
    fpsTimeAccumulator += deltaTime
    fpsFrameAccumulator += 1

    // 4. 关键：累计时间≥1000ms（1秒）时，更新帧率
    if (fpsTimeAccumulator >= 1000) {
      const fps = Math.round(fpsFrameAccumulator / (fpsTimeAccumulator / 1000)) // 帧数/秒
      // 安全更新显示（判断 fpsCounter 存在）
      if (fpsCounter.value) {
        fpsCounter.value.textContent = `${fps} FPS`
      }
      // 重置累计器，准备下一秒统计
      fpsTimeAccumulator = 0
      fpsFrameAccumulator = 0
    }

    // 5. 保持原逻辑：每16.67ms（≈60帧/秒）检测一次目标
    statusText.value = '正在识别...'
    if (deltaTime > 16.67) {
      const canvas = canvasRef.value
      if (!canvas) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const predictions = await model.detect(canvas)
      // 绘制识别框和输出结果（保持原逻辑不变）
      predictions.forEach((pred) => {
        const { bbox, class: className, score } = pred
        const [x, y, w, h] = bbox
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, w, h)
        ctx.font = '32px Arial'
        ctx.fillStyle = 'green'
        ctx.fillText(`${className} (${(score * 100).toFixed(1)}%)`, x, y - 5)
      })
      const outputDiv = document.getElementById('output')
      if (outputDiv) {
        outputDiv.innerHTML = predictions
          .map((pred) => `<p>${pred.class}: ${(pred.score * 100).toFixed(1)}%</p>`)
          .join('')
      }
    }
    requestAnimationFrame(detectFrame)
  }
  detectFrame()
}
async function startPlanesDetect() {
  try {
    if (isDetecting.value) return
    // 只加载一次模型
    const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
    const video = videoRef.value
    if (!video) return

    // 等待视频元数据加载完成（保留原逻辑）
    await new Promise<void>((resolve) => {
      if (video.readyState >= 2)
        resolve() // 已加载元数据
      else video.onloadedmetadata = () => resolve()
    })

    const canvas = canvasRef.value
    if (!canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    isDetecting.value = true
    lastFrameTime = performance.now()
    frameCount = 0

    // 将模型传入检测函数，避免重复加载
    planesDetect(model)
  } catch (error) {
    console.error('启动识别失败:', error)
    const errMsg = error instanceof Error ? error.message : '未知错误'
    alert(`启动识别失败: ${errMsg}`)
  }
}
async function planesDetect(model: cocoSsd.ObjectDetection) {
  const video = videoRef.value
  if (!video || !model) return
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (!isDetecting.value) return

  try {
    // 帧率计算逻辑（保留原逻辑）
    const now = performance.now()
    frameCount++
    if (now - lastFrameTime > 1000) {
      fps = Math.round((frameCount * 1000) / (now - lastFrameTime))
      if (fpsCounter.value) {
        fpsCounter.value.textContent = `${fps} FPS`
      }
      lastFrameTime = now
      frameCount = 0
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // 使用传入的模型检测，而非重复加载
    const predictions = await model.detect(video, 10, 0.1)
    detectedObjects = predictions
    detectedPlanes.value = filterPlanes(predictions)
    drawAnnotations()
  } catch (error) {
    console.error('帧检测错误:', error)
  }

  if (isDetecting.value) {
    requestAnimationFrame(() => planesDetect(model)) // 递归传入模型
  }
}
function filterPlanes(predictions: cocoSsd.DetectedObject[]) {
  // 基于COCO数据集定义平面类对象
  const planeClasses = ['dining table', 'table', 'desk', 'floor']

  // 过滤预测结果，只保留平面类对象
  return predictions.filter((prediction) => planeClasses.includes(prediction.class.toLowerCase()))
}

function drawAnnotations() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // 绘制平面标注
  detectedPlanes.value.forEach((plane, index) => {
    const { bbox, class: className } = plane
    const [x, y, width, height] = bbox
    // 为每个平面生成唯一的颜色
    const hue = (index * 137) % 360 // 使用黄金角算法获取不同的颜色
    const color = `hsl(${hue}, 70%, 50%)`

    // 绘制边框
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, width, height)

    // 绘制标签
    ctx.fillStyle = color
    ctx.fillRect(x, y - 20, 100, 20)
    ctx.fillStyle = 'white'
    ctx.font = '14px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(className, x + 50, y - 10)

    // 绘制网格
    drawGrid(x, y, width, height, color, 20)

    // 绘制尺寸
    drawDimensions(x, y, width, height, color)
  })
}

function drawGrid(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  gridSize: number,
) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.5 // 设置透明度

  // 绘制垂直线
  for (let i = 0; i <= width; i += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x + i, y)
    ctx.lineTo(x + i, y + height)
    ctx.stroke()
  }

  // 绘制水平线
  for (let i = 0; i <= height; i += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, y + i)
    ctx.lineTo(x + width, y + i)
    ctx.stroke()
  }

  ctx.globalAlpha = 1.0 // 恢复透明度
}
function drawDimensions(x: number, y: number, width: number, height: number, color: string) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const textSize = 14
  const padding = 5

  ctx.fillStyle = color
  ctx.font = `${textSize}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 绘制宽度尺寸
  const widthText = `${Math.round(width)}px`
  const widthTextWidth = ctx.measureText(widthText).width

  ctx.fillRect(
    x + width / 2 - widthTextWidth / 2 - padding,
    y - textSize - padding * 2,
    widthTextWidth + padding * 2,
    textSize + padding * 2,
  )

  ctx.fillStyle = 'white'
  ctx.fillText(widthText, x + width / 2, y - textSize / 2 - padding)

  // 绘制高度尺寸
  const heightText = `${Math.round(height)}px`
  const heightTextWidth = ctx.measureText(heightText).width

  ctx.fillStyle = color
  ctx.fillRect(
    x - heightTextWidth - padding * 2,
    y + height / 2 - textSize / 2 - padding,
    heightTextWidth + padding * 2,
    textSize + padding * 2,
  )

  ctx.fillStyle = 'white'
  ctx.fillText(heightText, x - heightTextWidth / 2 - padding, y + height / 2)
}

onMounted(() => {
  fpsCounter.value = document.getElementById('fpsCounter') // 帧率计数器
})
</script>

<style scoped>
#app {
  width: 100%;
  height: 100%;
  display: flex;
  position: absolute;
}

#ar_container {
  width: 50%;
  margin-left: 5%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

#operations_div {
  width: 30%;
  min-height: 99%;
  margin-left: 10%;
  border: 1px solid #000;
  display: flex;
  flex-direction: column;
  position: relative;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

#controls_div {
  width: 80%;
  height: 40%;
  margin-top: 60%;
  margin-left: 10%;
  border: 1px solid #000;
  position: absolute;
}

.video-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

.video-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.three-renderer {
  position: absolute !important;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
  z-index: 20;
  pointer-events: auto; /* 或 none（若不需要交互） */
}

#cameraButton {
  margin-top: 150%;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

#output {
  margin-top: 165%;
  width: 80%;
  height: 5%;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

#canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%; /* 显示时拉伸 */
  height: 100%;
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-crisp-edges;
  image-rendering: pixelated; /* 防止模糊渲染 */
  pointer-events: none;
  z-index: 10;
}

@media (max-width: 768px) {
  #app {
    flex-direction: column; /* 垂直排列 */
    padding: 0;
    margin: 0;
  }

  #ar_container {
    width: 100%; /* 占满全宽 */
    margin-left: 0;
    border-radius: 12px;
    height: 50vh; /* 视频占一半高度 */
    border-bottom: none; /* 去掉底部边框，更美观 */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  #operations_div {
    width: 100%;
    min-height: 50vh; /* 操作面板占另一半 */
    margin-left: 0;
    border-top: none;
    border-bottom: none;
    margin-top: 0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  #controls_div {
    width: 80%;
    height: 50%;
    margin-top: 50%;
    margin-left: 10%;
    border: 1px solid #000;
    position: absolute;
  }

  /* 调整按钮位置，适应小屏幕 */
  #cameraButton {
    margin-top: 105%;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    max-width: 200px;
  }
  #output {
    margin-top: 110%;
    width: 80%;
    height: 5%;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
  }

  #canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%; /* 显示时拉伸 */
    height: 100%;
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated; /* 防止模糊渲染 */
    pointer-events: none;
    z-index: 10;
  }
}
</style>
