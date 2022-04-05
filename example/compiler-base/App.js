import { ref } from "../../lib/mini-vue.esm.js"

export const App = {
  name: "App",
  template: `<div>hi,{{message}} {{count}}</div>`,
  setup() {
    const count = (window.count = ref(1))
    const message = ref("mini-vue")
    const changeCount = () => {
      count.value++
    }
    return {
      count,
      message,
    }
  },
}
