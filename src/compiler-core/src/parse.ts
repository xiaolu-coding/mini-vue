import { NodeTypes } from "./ast"

const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  // 转换为 context.source可以拿到content值
  const context = createParserContext(content)
  //
  return createRoot(parseChildren(context))
}

function parseChildren(context) {
  const nodes: any = []
  let node
  const s = context.source
  // 判断是否是{{}}语法
  if (s.startsWith("{{")) {
    // 解析插值语法
    node = parseInterpolation(context)
  } else if (s[0] === "<") {
    if (/[a-z]/i.test(s[1])) {
      node = parseElement(context)
    }
  }
  // 如果node没有值，就是text
  if (!node) {
    node = parseText(context)
  }
  // 推进到nodes
  nodes.push(node)
  return nodes
}

function parseInterpolation(context) {
  const openDelimiter = "{{"
  const closeDelimiter = "}}"
  // 关闭的}}的index
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  )
  // 推进，干掉{{
  advanceBy(context, openDelimiter.length)
  // 减掉推进前的{{ 2 就是插值语法内部的文本长度
  const rawContentLength = closeIndex - openDelimiter.length
  // 截取出插值语法中的值 {{message}} -> message
  const rawContent = parseTextData(context, rawContentLength)
  // 去空格 {{ message }} 这种情况
  const content = rawContent.trim()
  // 截取}}后面的
  advanceBy(context, closeDelimiter.length)
  // 返回相应的对象
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  }
}

function parseElement(context) {
  const element = parseTag(context, TagType.Start)
  parseTag(context, TagType.End)
  console.log(context.source)

  return element
}

function parseTag(context, type: TagType) {
  // 1.解析 tag
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)
  const tag = match[1]
  // 2.删除处理完成的代码  推进
  advanceBy(context, match[0].length)
  advanceBy(context, 1)
  // 如果是结束标签，直接返回
  if (type === TagType.End) return
  return {
    type: NodeTypes.ELEMENT,
    tag,
  }
}

function parseText(context: any) {
  const content = parseTextData(context, context.source.length)

  return {
    type: NodeTypes.TEXT,
    content,
  }
}

function parseTextData(context: any, length: number) {
  // 1.获取content内容
  const content = context.source.slice(0, length)
  // 2.推进
  advanceBy(context, content.length)
  return content
}
// 推进 截取
function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length)
}

function createRoot(children) {
  return {
    children,
  }
}

function createParserContext(content: string): any {
  return {
    source: content,
  }
}
