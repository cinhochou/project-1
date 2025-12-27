# project-1

本项目于2025年12月25日（研一上学期在广州大学）后基本不再进行更新，仅作为一个AR-3D协作模型练手项目，包含了大量前期试错的项目，比如使用deepLab、coco-ssd和tensorflow.js对平面进行识别，再加入3D模型到渲染场景中，但是这样做带来了极大的性能开销和极差的效果，我已经放弃这条道路了。后面我使用了GitHub上的AR.js项目的基础上进行改进和加入了yjs完成了这个AR-3D模型协作项目。使用yjs需要部署一个y-webrtc-signaling服务器，端口是4444，需要自行配置。可以搭配ngrok内网穿透开启网页摄像头使用这个项目。本人的前端项目工程意识不是很强，且这个项目出现了大量的问题，仅供学习。

--主要项目都在examples文件夹下，basic.html是AR-3D协作模型的主体--

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Cypress](https://www.cypress.io/)

```sh
npm run test:e2e:dev
```

This runs the end-to-end tests against the Vite development server.
It is much faster than the production build.

But it's still recommended to test the production build with `test:e2e` before deploying (e.g. in CI environments):

```sh
npm run build
npm run test:e2e
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

###author 
@cinhoChou from GuangZhou university
