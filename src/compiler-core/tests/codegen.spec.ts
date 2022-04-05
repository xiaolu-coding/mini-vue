import { generate } from "../src/codegen"
import { baseParse } from "../src/parse"
import { transform } from "../src/transform"
import { transformExpression } from "../src/transforms/transformExpression"



describe('codegen', () => {
  it('string', () => {
    const ast = baseParse('hi 1')
    transform(ast)
    const { code } = generate(ast)

    // 快照 第一次会拍下照片，之后都会对比照片，照片在snapshot文件夹下

    // 1. 抓bug
    // 2. 有意的修改 -u 就会更新照片
    expect(code).toMatchSnapshot()
  })

  it('interpolation', () => {
     const ast = baseParse('{{message}}')
     transform(ast, {
       nodeTransforms: [transformExpression]
     })
     const { code } = generate(ast)
     expect(code).toMatchSnapshot()
  })
})
