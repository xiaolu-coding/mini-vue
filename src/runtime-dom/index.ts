
import { createRenderer } from '../runtime-core'
import { isOn } from '../shared'

// 创建元素 将方法接口通过createRenderer传过去，这就是custom renderer的核心，可以自定义渲染器
function createElement(type) {
  return document.createElement(type)
}

function patchProp(el, key, val) {
  if (isOn(key)) {
    // 将on后面的转小写
    const event = key.slice(2).toLowerCase()
    // 添加事件
    el.addEventListener(event, val)
  }
  el.setAttribute(key, val)
}

function insert(el, container) {
  container.append(el)
}

const renderer:any = createRenderer({
  createElement,
  patchProp,
  insert
})

export function createApp(...args) {
  // createRenderer返回的是 createApp: createAppAPI()，因此这里是调用createAppAPI
  return renderer.createApp(...args)
}

export * from '../runtime-core'