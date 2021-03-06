import { isObject } from "../shared"
import { ShapeFlags } from "../shared/ShapeFlags"

export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')

export {
  createVNode as createElementVNode
}

// 创建vnode 这里的type就是app内部的对象
export function createVNode(type, props?, children?) {
  console.log(`createVNode  ----- 为 ${isObject(type) ? type.template : type} 创建vnode`)
  const vnode = {
    type,
    props,
    children,
    component: null,
    key: props && props.key,
    shapeFlag: getShapeFlag(type),
    el: null,
  }

  // 如果孩子是字符串，代表就是TEXT_CHILDREN类型，用 | 修改
  if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    // 如果是数组，代表就是ARRAY_CHILDREN类型，用 | 修改
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  // 当是组件类型 并且 children是 object时，是slots
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === "object") {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
    }
  }
  return vnode
}

export function createTextVnode(text: string) {
  return createVNode(Text, {}, text)
}

function getShapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}
