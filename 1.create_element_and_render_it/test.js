// 创建文本节点的react元素对象
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    }
  }
}

// 创建一般节点的react元素对象
function createElement(type, props, ...children) {
  return {
    type,
    props: { 
      ...props, 
      children: children.map(child =>
        typeof child !== 'object'
        ? createTextElement(child)
        : child
      )
    }
  }
}

// 将react元素对象渲染为DOM节点
function render(element, container) {
  const node = element.type !== 'TEXT_ELEMENT'
              ? document.createElement(element.type)
              : document.createTextNode('')

  Object.keys(element.props)
        .filter(key => key !== 'children')
        .forEach(name => node[name] = element.props[name])
  
  element.props.children.forEach(child => render(child, node))

  container.appendChild(node)
}


const dom = createElement(
  'div', 
  { id: 'foo' }, 
  createElement('a', { href: 'https://www.baidu.com' }, '跳转'),
  '你好啊！'
)

const container = document.getElementById('root')
render(dom, container)
