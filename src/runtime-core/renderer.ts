import { createComponentInstance, setupComponent } from "./component"
import { ShapeFlags } from "../shared/ShapeFlags"
import { Fragment, Text } from "./vnode"
import { createAppAPI } from "./createApp"
import { effect } from "../reactivity/effect"
import { EMPTY_OBJ } from "../shared"

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options
  function render(vnode, container) {
    // 调用patch
    patch(null, vnode, container, null)
  }
  function patch(n1, n2, container, parentComponent) {
    // 结构出shapeFlag
    const { type, shapeFlag } = n2
    // Fragment 只渲染children
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break
      case Text:
        processText(n1, n2, container)
        break
      default:
        // 通过&运算查找，看看是否是ElEMENT类型
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 如果是element
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 通过&运算查找，看看是否是STATEFUL_COMPONENT类型
          // 处理组件
          processComponent(n1, n2, container, parentComponent)
        }
        break
    }
  }

  function processText(n1, vnode, container) {
    // 解构出children,此时的children就是text节点的文本内容
    const { children } = vnode
    // 元素记得复制一份给el，方便之后的diff
    const textNode = (vnode.el = document.createTextNode(children))
    // 挂载
    container.append(textNode)
  }

  // 如果是Fragment，就直接去挂载孩子们，孩子们里面patch触发后面的process那些
  function processFragment(n1, n2, container, parentComponent) {
    mountChildren(n2.children, container, parentComponent)
  }

  function processComponent(n1, n2, container, parentComponent) {
    mountComponent(n2, container, parentComponent)
  }

  function processElement(n1, n2, container, parentComponent) {
    // n1不存在时，是挂载初始化
    if (!n1) {
      mountElement(n2, container, parentComponent)
    } else {
      patchElement(n1, n2, container, parentComponent)
    }
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
      mountChildren(vnode.children, el, parentComponent)
    }
    // 遍历设置属性 还要对里面的方法进行处理
    for (const key in props) {
      const val = props[key]
      // 处理prop
      hostPatchProp(el, key, null, val)
    }
    // 插入节点
    hostInsert(el, container)
  }

  function mountChildren(children, container, parentComponent) {
    //  循环挂载孩子
    children.forEach((v) => {
      patch(null, v, container, parentComponent)
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

  function patchElement(n1, n2, container, parentComponent) {
    // update
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ
    // el是存在Instance里的，给n2也复制一份，因为下一次更新n2就是n1了
    const el = (n2.el = n1.el)
    // 更新孩子
    patchChildren(n1, n2, el, parentComponent)
    // 更新props属性
    patchProps(el, oldProps, newProps)
  }

  function patchChildren(n1, n2, container, parentComponent) {
    const prevShapeFlag = n1.shapeFlag
    const newShpaeFlag = n2.shapeFlag
    const oldChildren = n1.children
    const newChildren = n2.children

    if (newShpaeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 如果新的是文本类型 老的是数组类型，那么要卸载掉老的children，再text
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 卸载老的children
        ummountChildren(n1.children)
      }
      // 1. 新的文本类型，老的数组类型，卸载掉老的之后，oldChildren 肯定!== newChildren，所以会走这
      // 2. 也有可能是两者都是文本类型，然后文本值不同，直接设置文本值
      if (oldChildren !== newChildren) {
        // 设置新的文本
        hostSetElementText(container, newChildren)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, '')
        mountChildren(newChildren, container, parentComponent)
      }
    }
  }

  function patchProps(el, oldProps, newProps) {
    // 只有不一样才需要对比
    if (oldProps !== newProps) {
      // 遍历新props
      for (const key in newProps) {
        const prevProp = oldProps[key]
        const nextProp = newProps[key]
        // 如果不同，就修改
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp)
        }
      }
      // 当不是空对象时，才要检测
      if (oldProps !== EMPTY_OBJ) {
        // 当老的props里的key不在新的props里，删除属性
        for (const key in oldProps) {
          if (!(key in newProps)) {
            // 第四个参数为null时，删除
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }
    }
  }

  function ummountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      // 通过el拿到真实的dom元素，然后卸载
      const el = children[i].el
      // remove
      hostRemove(el)
    }
  }

  function setupRenderEffect(instance: any, initialVnode, container) {
    effect(() => {
      if (!instance.isMounted) {
        // 取出代理对象
        const { proxy } = instance
        // 调用render函数 subTree就是vnode树
        // 将this指向代理对象，因此this.msg可用 subTree复制一份以便后面更新的时候能取到
        const subTree = (instance.subTree = instance.render.call(proxy))
        // 再patch 初始化
        patch(null, subTree, container, instance)
        // 所有的element mount之后 这时候的subTree就是根组件了
        initialVnode.el = subTree.el
        // 初始化挂载后，为true，之后进来都是更新逻辑
        instance.isMounted = true
      } else {
        const { proxy } = instance
        // 拿到当前的subTree
        const subTree = instance.render.call(proxy)
        // 拿到之前的subTree
        const PrevSubTree = instance.subTree
        // 把当前的subTree给之前的subTree，以便后来的更新
        instance.subTree = subTree
        // 更新
        patch(PrevSubTree, subTree, container, instance)
      }
    })
  }

  return {
    // 为了传render函数给createApp使用
    createApp: createAppAPI(render),
  }
}
