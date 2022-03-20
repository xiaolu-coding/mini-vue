import { ShapeFlags } from "../shared/ShapeFlags"

export function initSlots(instance, children) {
  // 解构vnode，判断是否是slot类型
  const { vnode } = instance
  if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    // 处理slots
    normalizeObjectSlots(instance.slots, children)
  }
}

function normalizeObjectSlots(slots, children) {
  // 遍历children对象，将对象传给slots，内部做数组化处理，给renderSlots用
  for (const key in children) {
    const value = children[key]
    // 因为value是函数 slots[key]参数作为value的参数去执行
    slots[key] = (props) => normalizeSlotValue(value(props))
  }
}

// 数组化处理
function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value]
}
