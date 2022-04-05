import { createVNode } from "./vnode"

export function createAppAPI(render) {
  console.log('createAppAPI  ------ 返回给renderer渲染器对象的createApp方法')
  return function createApp(rootComponent) {
    console.log('createApp  ------- renderer渲染器调用的createApp方法')
    return {
      mount(rootContainer) {
        console.log('mount  ------ 执行挂载')
        // componet -> vnode
        // 所有的逻辑操作都会基于vnode做处理
        // 将根组件转换为vnode
        const vnode = createVNode(rootComponent)

        render(vnode, rootContainer)
      },
    }
  }
}
