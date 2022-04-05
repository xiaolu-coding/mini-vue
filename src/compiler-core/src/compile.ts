import { generate } from "./codegen"
import { baseParse } from "./parse"
import { transform } from "./transform"
import { transformExpression } from "./transforms/transformExpression"
import { transformText } from "./transforms/transformText"
import { transformElement } from "./transforms/transfromElement"


export function baseCompile(template) {
  console.log('compile  ----- 将template转换为render函数 其实就是执行parse transform generate')
  const ast: any = baseParse(template)
  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  })
  return generate(ast)
}
