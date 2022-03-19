// 创建vnode 这里的type就是app内部的对象
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
  }

  return vnode
}
