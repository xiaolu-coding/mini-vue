import { h } from "../../lib/mini-vue.esm.js"

// props三点
// 1.可以传进setup
// 2.可以通过this.直接访问props
// 3.props不能被修改，是readonly

export const Foo = {
  
  setup(props) {
    // props.count
    console.log(props)
    props.count++
    console.log(props)
  },

  render() {
    return h('div', {}, 'foo:' + this.count)
  }
}