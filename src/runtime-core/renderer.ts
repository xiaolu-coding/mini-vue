import { createComponentInstance, setupComponent } from "./component"
import { ShapeFlags } from "../shared/ShapeFlags"
import { Fragment, Text } from "./vnode"
import { createAppAPI } from "./createApp"
import { effect } from "../reactivity/effect"
import { EMPTY_OBJ } from "../shared"
import { shouldUpdateComponent } from "./componentUpdateUtils"

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
    patch(null, vnode, container, null, null)
  }
  function patch(n1, n2, container, parentComponent, anchor) {
    // 结构出shapeFlag
    const { type, shapeFlag } = n2
    // Fragment 只渲染children
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor)
        break
      case Text:
        processText(n1, n2, container)
        break
      default:
        // 通过&运算查找，看看是否是ElEMENT类型
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 如果是element
          processElement(n1, n2, container, parentComponent, anchor)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 通过&运算查找，看看是否是STATEFUL_COMPONENT类型
          // 处理组件
          processComponent(n1, n2, container, parentComponent, anchor)
        }
        break
    }
  }

  function processText(n1, n2, container) {
    // 解构出children,此时的children就是text节点的文本内容
    const { children } = n2
    // 元素记得复制一份给el，方便之后的diff
    const textNode = (n2.el = document.createTextNode(children))
    // 挂载
    container.append(textNode)
  }

  // 如果是Fragment，就直接去挂载孩子们，孩子们里面patch触发后面的process那些
  function processFragment(n1, n2, container, parentComponent, anchor) {
    mountChildren(n2.children, container, parentComponent, anchor)
  }

  function processComponent(n1, n2, container, parentComponent, anchor) {
    if (!n1) {
      mountComponent(n2, container, parentComponent, anchor)
    } else {
      updateComponent(n1, n2)
    }
  }

  function processElement(n1, n2, container, parentComponent, anchor) {
    // n1不存在时，是挂载初始化
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor)
    } else {
      patchElement(n1, n2, container, parentComponent, anchor)
    }
  }

  function mountElement(vnode, container, parentComponent, anchor) {
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
      mountChildren(vnode.children, el, parentComponent, anchor)
    }
    // 遍历设置属性 还要对里面的方法进行处理
    for (const key in props) {
      const val = props[key]
      // 处理prop
      hostPatchProp(el, key, null, val)
    }
    // 插入节点
    hostInsert(el, container, anchor)
  }

  function mountChildren(children, container, parentComponent, anchor) {
    //  循环挂载孩子
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor)
    })
  }

  function mountComponent(initialVnode, container, parentComponent, anchor) {
    // 1. 创建组件实例，用以存储各种属性 createComponentInstance
    // 2. 初始化组件实例 setupComponent
    // 3. 副作用函数挂载 setupRenderEffect
    // 给虚拟节点也复制一份组件实例，为了在后面更新时拿到
    const instance = (initialVnode.component = createComponentInstance(
      initialVnode,
      parentComponent
    ))
    // 初始化组件实例
    setupComponent(instance)

    setupRenderEffect(instance, initialVnode, container, anchor)
  }

  function updateComponent(n1, n2) {
    // 从n1取出组件实例赋值给n2和instance 因为n2是没有compoent的，但是n2之后又会作为老节点
    const instance = (n2.component = n1.component)
    if (shouldUpdateComponent(n1, n2)) {
      // 存储新节点
      instance.next = n2
      // 执行runner方法，也就是调用传入的函数 也就是执行了组件的render函数
      instance.update()
    } else {
      // 不需要更新的话，还是要保存el和vnode以便下次更新作为老节点使用
      n2.el = n1.el
      n2.vnode = n2
    }
  }

  function patchElement(n1, n2, container, parentComponent, anchor) {
    // update
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ
    // el是存在Instance里的，给n2也复制一份，因为下一次更新n2就是n1了
    const el = (n2.el = n1.el)
    // 更新孩子
    patchChildren(n1, n2, el, parentComponent, anchor)
    // 更新props属性
    patchProps(el, oldProps, newProps)
  }

  function patchChildren(n1, n2, container, parentComponent, anchor) {
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
        // 清空文本
        hostSetElementText(container, "")
        // 挂载孩子
        mountChildren(newChildren, container, parentComponent, anchor)
      } else {
        // array to array的情况 diff
        patchKeyedChildren(
          oldChildren,
          newChildren,
          container,
          parentComponent,
          anchor
        )
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

  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    const l2 = c2.length
    let i = 0 // i是指针，从左侧开始
    let e1 = c1.length - 1 // e1是c1的尾部
    let e2 = l2 - 1 // e2是c2的尾部
    function isSameNodeType(n1, n2) {
      // 判断是否相同节点，可以从type和key来判断
      return n1.type === n2.type && n1.key === n2.key
    }
    // 左侧对比
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      // 如果是相同类型的节点
      if (isSameNodeType(n1, n2)) {
        // 递归遍历
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      i++
    }
    // 右侧对比
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1] // n1为尾部
      const n2 = c2[e2] // n2为尾部

      if (isSameNodeType(n1, n2)) {
        // 递归遍历
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      // 右侧对比，尾部--
      e1--
      e2--
    }
    // 新的比老的多 创建
    if (i > e1) {
      // 指针大于了e1，代表新的比老的多
      if (i <= e2) {
        // 并且指针小于等于e2，代表新的增加了 此时的e2 + 1是需要增加的锚点的位置
        const nextPos = e2 + 1
        // 如果锚点位置<c2的长度，获取el，不然就是null，插后面
        const anchor = nextPos < l2 ? c2[nextPos].el : null
        while (i <= e2) {
          // 因此调用Patch 第一个参数为Null,为挂载 anchor锚点，有的话就是插前面
          patch(null, c2[i], container, parentComponent, anchor)
          i++
        }
      }
    } else if (i > e2) {
      // 老的比新的长
      while (i <= e1) {
        // 删除老的节点
        hostRemove(c1[i].el)
        i++
      }
    } else {
      // 乱序的部分
      // 中间对比
      let s1 = i // i是指针，也就是经过双端对比后得到的左端的索引值
      let s2 = i

      const toBePatched = e2 - s2 + 1 // 经过双端对比后剩下的新节点的数量
      let patched = 0 // 记录新节点patch的次数，
      const keyToNewIndexMap = new Map()
      // 定宽数组，长度为新节点的数量
      const newIndexToOldIndexMap = new Array(toBePatched)
      // 是否去移动
      let moved = false
      let maxNewIndexSoFar = 0
      // 初始化newIndexToOldIndexMap
      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0
      // 遍历经过双端对比后剩下的新节点，并将其转换成map映射的方式
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]
        // 转换成 E => 2  D => 3这种，通过key值得到相应索引
        keyToNewIndexMap.set(nextChild.key, i)
      }
      // 遍历经过双端对比后剩下的老节点 e1是老节点右端的索引值
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]
        // 如果新节点patch次数大于新节点数量，直接把后续老节点都删除
        if (patched >= toBePatched) {
          hostRemove(prevChild.el)
          // 直接把后续老节点都删除，不用执行下面的代码
          continue
        }
        let newIndex
        // 有key时 使用map映射
        if (prevChild.key != null) {
          // 看老节点是否在新节点的map上存在
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // 没有key时，遍历
          for (let j = s2; j <= e2; j++) {
            // 遍历查找新节点中是否有与老节点相同的节点
            if (isSameNodeType(prevChild, c2[j])) {
              newIndex = j
              // 找到就跳出
              break
            }
          }
        }
        // 如果这时候的newIndex还没被赋值，代表老节点在新节点中没有，因此要删除
        if (newIndex === undefined) {
          hostRemove(prevChild.el)
        } else {
          // 记录索引和最大索引
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            // 如果新的索引比最大的小，那么肯定是需要移动的，比如 1 2 3 -> 1 3 2
            moved = true
          }
          // 这时候的newIndex是和老节点相同的新节点的双端对比前索引值，newIndex-s2为双端对比后的索引值
          newIndexToOldIndexMap[newIndex - s2] = i + 1 // i+1避免为0的情况，为0时，是需要增加新节点
          // 如果这时候newIndex有值，代表老节点在新节点中有相同的，因此将对应的新老节点patch
          patch(prevChild, c2[newIndex], container, parentComponent, null)
          patched++
        }
      }
      // 得到最长递增子序列  根据是否移动取值
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []

      let j = increasingNewIndexSequence.length - 1
      // 倒序遍历，将稳定的增长子序列的节点插在稳定节点上
      // 比如  a b c d e f g  ->  a b e c d f g
      // 那就是把d 插到f前，再把c插到d前，然后移动e
      for (let i = toBePatched - 1; i >= 0; i--) {
        // i是双端对比后的索引，加上s2也就是左边的索引
        // nextIndex就是双端对比前的索引
        const nextIndex = i + s2
        // nextChild就是相应的节点
        const nextChild = c2[nextIndex]
        // 锚点，倒着向前插
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null
        // 如果是0的话，代表老节点里没有，要新创建
        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anchor)
        } else if (moved) {
          // 如果需要移动
          // j < 0，肯定不同了
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            // 如果不相同，插入
            hostInsert(nextChild.el, container, anchor)
          } else {
            // 如果相同，不需要移动
            j--
          }
        }
      }
    }
  }

  function setupRenderEffect(instance: any, initialVnode, container, anchor) {
    // effect会返回runner，由update接收，当再次调用update时，会继续调用传入的函数
    instance.update = effect(() => {
      if (!instance.isMounted) {
        console.log("init")
        // 取出代理对象
        const { proxy } = instance
        // 调用render函数 subTree就是vnode树
        // 将this指向代理对象，因此this.msg可用 subTree复制一份以便后面更新的时候能取到
        const subTree = (instance.subTree = instance.render.call(proxy))
        // 再patch 初始化
        patch(null, subTree, container, instance, anchor)
        // 所有的element mount之后 这时候的subTree就是根组件了
        initialVnode.el = subTree.el
        // 初始化挂载后，为true，之后进来都是更新逻辑
        instance.isMounted = true
      } else {
        console.log("update")
        const { next, vnode } = instance
        if (next) {
          next.el = vnode.el
          // 在更新之前，去改变组件实例上的props属性
          updateComponentPreRender(instance, next)
        }
        const { proxy } = instance
        // 拿到当前的subTree
        const subTree = instance.render.call(proxy)
        // 拿到之前的subTree
        const PrevSubTree = instance.subTree
        // 把当前的subTree给之前的subTree，以便后来的更新
        instance.subTree = subTree
        // 更新
        patch(PrevSubTree, subTree, container, instance, anchor)
      }
    })
  }
  return {
    // 为了传render函数给createApp使用
    createApp: createAppAPI(render),
  }
}

function updateComponentPreRender(instance, nextVnode) {
  // 将新的节点作为下一次更新的老节点
  instance.vnode = nextVnode
  // 将新节点的next置为null
  instance.next = null
  // 赋值props
  instance.props = nextVnode.props
}

function getSequence(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}
