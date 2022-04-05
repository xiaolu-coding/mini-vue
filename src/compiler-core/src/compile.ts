import { generate } from "./codegen"
import { baseParse } from "./parse"
import { transform } from "./transform"
import { transformExpression } from "./transforms/transformExpression"
import { transformText } from "./transforms/transformText"
import { transformElement } from "./transforms/transfromElement"


export function baseCompile(template) {
  const ast: any = baseParse(template)
  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  })
  return generate(ast)
}
