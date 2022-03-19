import { createVNode } from "./vnode"
import { render } from "./renderer"

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // componet -> vnode
      // 所有的逻辑操作都会基于vnode做处理
      // 将根组件转换为vnode
      const vnode = createVNode(rootComponent)

      render(vnode, rootContainer)
    },
  }
}
