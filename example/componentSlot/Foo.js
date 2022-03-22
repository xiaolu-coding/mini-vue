import { h, renderSlots } from "../../lib/mini-vue.esm.js"

export const Foo = {
  setup() {
    return {}
  },
  render() {
    const foo = h("p", {}, "foo")

    // Foo .vnode. children
    // console.log(this.$slots)
    // children -> vnode
    //
    // renderSlots
    // 具名插槽
    // 1. 获取到要渲染的元素 1
    // 2. 要获取到渲染的位置
    // 作用域插槽
    const age = 18
    // 这时slots是通过children获取到的
    // 当是数组的时候，就要将数组转为vnode，因此再一次h
    // return h("div", {},  [foo, h('div', {}, this.$slots)]
    return h(
      "div",
      {},
      [  
        renderSlots(this.$slots, "header", {age}),
        foo,
        renderSlots(this.$slots, "footer"),
      ]
      // [
      //   renderSlots(this.$slots, "header", {
      //     age,
      //   }),
      //   foo,
      //   renderSlots(this.$slots, "footer"),
      // ]
    )
  },
}
