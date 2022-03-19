import { createComponentInstance, setupComponent } from "./component"
import { isObject } from "../shared/index"

export function render(vnode, container) {
  // 调用patch
  patch(vnode, container)
}

function patch(vnode, container) {
  // todo 要先判断类型，再做处理
  if (typeof vnode.type === "string") {
    // 如果是element
    processElement(vnode, container)
  } else if (isObject(vnode.type)) {
    // 处理组件
    processComponent(vnode, container)
  }
}

function processComponent(vnode, container) {
  mountComponent(vnode, container)
}

function processElement(vnode, container) {
  mountElement(vnode, container)
}

function mountElement(vnode, container) {
  const { type, props, children } = vnode
  // 将el存一份在vnode上，以便$el访问
  const el = (vnode.el = document.createElement(type))
  // children 可能是string ,array
  // 如果是string，
  if (typeof children === "string") {
    // 赋值
    el.textContent = children
    
  } else if (Array.isArray(children)) {
    // 如果是数组 遍历数组，进行patch，此时容器为el
    mountChildren(vnode, el)
  }
  // 遍历设置属性
  for (const key in props) {
    const val = props[key]
    el.setAttribute(key, val)
  }
  container.append(el)
}

function mountChildren(vnode, container) {
  //  循环挂载孩子
   vnode.children.forEach((v) => {
    patch(v, container)
  })
}

function mountComponent(vnode, container) {
  // 1. 创建组件实例，用以存储各种属性 createComponentInstance
  // 2. 初始化组件实例 setupComponent
  // 3. 副作用函数挂载 setupRenderEffect
  const instance = createComponentInstance(vnode)
  // 初始化组件实例
  setupComponent(instance)

  setupRenderEffect(instance, vnode, container)
}

function setupRenderEffect(instance: any, vnode, container) {
  // 取出代理对象
  const {proxy} = instance
  // 调用render函数 subTree就是vnode树 
  // 将this指向代理对象，因此this.msg可用
  const subTree = instance.render.call(proxy)
  // 再patch递归
  patch(subTree, container)

  // 所有的element mount之后 这时候的subTree就是根组件了
  vnode.el = subTree.el
}
