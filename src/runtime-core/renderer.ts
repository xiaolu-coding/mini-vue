import { createComponentInstance, setupComponent } from "./component"
import { ShapeFlags } from "../shared/ShapeFlags"
import { Fragment, Text } from "./vnode"
import { createAppAPI } from "./createApp"

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options
  function render(vnode, container) {
    // 调用patch
    patch(vnode, container, null)
  }
  function patch(vnode, container, parentComponent) {
    // 结构出shapeFlag
    const { type, shapeFlag } = vnode
    // Fragment 只渲染children
    switch (type) {
      case Fragment:
        processFragment(vnode, container, parentComponent)
        break
      case Text:
        processText(vnode, container)
        break
      default:
        // 通过&运算查找，看看是否是ElEMENT类型
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 如果是element
          processElement(vnode, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 通过&运算查找，看看是否是STATEFUL_COMPONENT类型
          // 处理组件
          processComponent(vnode, container, parentComponent)
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
  function processFragment(vnode, container, parentComponent) {
    mountChildren(vnode, container, parentComponent)
  }

  function processComponent(vnode, container, parentComponent) {
    mountComponent(vnode, container, parentComponent)
  }

  function processElement(vnode, container, parentComponent) {
    mountElement(vnode, container, parentComponent)
  }

  function mountElement(vnode, container, parentComponent) {
    const { type, props, children, shapeFlag } = vnode
    // 将el存一份在vnode上，以便$el访问
    const el = (vnode.el = hostCreateElement(type))
    // children 可能是string ,array
    // 通过&运算查找，如果是TEXT_CHILDREN类型
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 通过&运算查找，如果是ARRAY_CHILDREN类型
      // 如果是数组 遍历数组，进行patch，此时容器为el
      mountChildren(vnode, el, parentComponent)
    }
    // 遍历设置属性 还要对里面的方法进行处理
    for (const key in props) {
      const val = props[key]
      // 处理prop
      hostPatchProp(el, key, val)
    }
    // 插入节点
    hostInsert(el, container)
  }

  function mountChildren(vnode, container, parentComponent) {
    //  循环挂载孩子
    vnode.children.forEach((v) => {
      patch(v, container, parentComponent)
    })
  }

  function mountComponent(initialVnode, container, parentComponent) {
    // 1. 创建组件实例，用以存储各种属性 createComponentInstance
    // 2. 初始化组件实例 setupComponent
    // 3. 副作用函数挂载 setupRenderEffect
    const instance = createComponentInstance(initialVnode, parentComponent)
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
    patch(subTree, container, instance)

    // 所有的element mount之后 这时候的subTree就是根组件了
    initialVnode.el = subTree.el
  }

  return {
    // 为了传render函数给createApp使用
    createApp: createAppAPI(render),
  }
}
