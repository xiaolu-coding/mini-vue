import { NodeTypes } from "./ast"

const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  // 转换为 context.source可以拿到content值
  const context = createParserContext(content)
  //
  return createRoot(parseChildren(context, []))
}

function parseChildren(context, ancestors) {
  const nodes: any = []

  while (!isEnd(context, ancestors)) {
    let node
    const s = context.source
    // 判断是否是{{}}语法
    if (s.startsWith("{{")) {
      // 解析插值语法
      node = parseInterpolation(context)
    } else if (s[0] === "<") {
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors)
      }
    }
    // 如果node没有值，就是text
    if (!node) {
      node = parseText(context)
    }
    // 推进到nodes
    nodes.push(node)
  }
  return nodes
}

function isEnd(context, ancestors) {
  const s = context.source
  // 2.当遇到结束标签的时候
  if (s.startsWith("</")) {
    // 从栈尾开始
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const tag = ancestors[i].tag
      // 如果标签对了，就true
      if (startsWithEndTagOpen(s, tag)) {
        return true
      }
    }
  }
  // if (parentTag && s.startsWith(`</${parentTag}>`)) {
  //   return true
  // }
  // 1.source有值的时候。为true，没值的时候false结束
  return !s
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

function parseElement(context: any, ancestors) {
  // 解析括号
  const element: any = parseTag(context, TagType.Start)
  // 栈收集标签
  ancestors.push(element)
  element.children = parseChildren(context, ancestors)
  ancestors.pop()
  if (startsWithEndTagOpen(context.source, element.tag)) {
    // 解析结果的括号
    parseTag(context, TagType.End)
  } else {
    throw new Error(`缺少结束标签:${element.tag}`)
  }

  return element
}

function startsWithEndTagOpen(source, tag) {
  return source.startsWith('</') && source.slice(2, 2 + tag.length).toLowerCase() === tag
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
  // 可能后面会遇到{{，或者直接到最后
  let endIndex = context.source.length
  let endTokens = ["<", "{{"]

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i])
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const content = parseTextData(context, endIndex)
  console.log("content---------- ", content)
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
    type: NodeTypes.ROOT,
  }
}

function createParserContext(content: string): any {
  return {
    source: content,
  }
}
