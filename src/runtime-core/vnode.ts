import { ShapeFlags } from "../shared/ShapeFlags"

// 创建vnode 这里的type就是app内部的对象
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
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

  return vnode
}

function getShapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}
