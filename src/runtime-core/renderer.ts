import { createComponentInstance, setupComponent } from "./component"
import { isOn } from "../shared/index"
import { ShapeFlags } from "../shared/ShapeFlags"
import { Fragment, Text } from "./vnode"

export function render(vnode, container) {
  // 调用patch
  patch(vnode, container)
}

function patch(vnode, container) {
  // 结构出shapeFlag
  const { type, shapeFlag } = vnode
  // Fragment 只渲染children
  switch (type) {
    case Fragment:
      processFragment(vnode, container)
      break
    case Text: 
      processText(vnode, container)
      break
    default:
      // 通过&运算查找，看看是否是ElEMENT类型
      if (shapeFlag & ShapeFlags.ELEMENT) {
        // 如果是element
        processElement(vnode, container)
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // 通过&运算查找，看看是否是STATEFUL_COMPONENT类型
        // 处理组件
        processComponent(vnode, container)
      }
      break
  }
}

function processText(vnode, container) {
  // 解构出children,此时的children就是text节点的文本内容
  const { children } = vnode
  // 元素记得复制一份给el，方便之后的diff
  const textNode = (vnode.el = document.createTextNode(children))
  // 挂载
  container.append(textNode)
}

// 如果是Fragment，就直接去挂载孩子们，孩子们里面patch触发后面的process那些
function processFragment(vnode, container) {
  mountChildren(vnode, container)
}

function processComponent(vnode, container) {
  mountComponent(vnode, container)
}

function processElement(vnode, container) {
  mountElement(vnode, container)
}

function mountElement(vnode, container) {
  const { type, props, children, shapeFlag } = vnode
  // 将el存一份在vnode上，以便$el访问
  const el = (vnode.el = document.createElement(type))
  // children 可能是string ,array
  // 通过&运算查找，如果是TEXT_CHILDREN类型
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 通过&运算查找，如果是ARRAY_CHILDREN类型
    // 如果是数组 遍历数组，进行patch，此时容器为el
    mountChildren(vnode, el)
  }
  // 遍历设置属性 还要对里面的方法进行处理
  for (const key in props) {
    const val = props[key]
    if (isOn(key)) {
      // 将on后面的转小写
      const event = key.slice(2).toLowerCase()
      // 添加事件
      el.addEventListener(event, val)
    }
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

function mountComponent(initialVnode, container) {
  // 1. 创建组件实例，用以存储各种属性 createComponentInstance
  // 2. 初始化组件实例 setupComponent
  // 3. 副作用函数挂载 setupRenderEffect
  const instance = createComponentInstance(initialVnode)
  // 初始化组件实例
  setupComponent(instance)

  setupRenderEffect(instance, initialVnode, container)
}

function setupRenderEffect(instance: any, initialVnode, container) {
  // 取出代理对象
  const { proxy } = instance
  // 调用render函数 subTree就是vnode树
  // 将this指向代理对象，因此this.msg可用
  const subTree = instance.render.call(proxy)
  // 再patch递归
  patch(subTree, container)

  // 所有的element mount之后 这时候的subTree就是根组件了
  initialVnode.el = subTree.el
}
