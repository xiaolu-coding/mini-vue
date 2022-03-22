import { createVNode, Fragment } from "../vnode"

export function renderSlots(slots, name, props) {
  const slot = slots[name]

  if (slot) {
    // 如果是函数
    if (typeof slot === "function") {
      return createVNode(Fragment, {}, slot(props))
    }
  }
}
