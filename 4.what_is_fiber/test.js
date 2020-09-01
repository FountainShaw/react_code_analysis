function createElement(type, props, ...children) {
  return { type, props: {
    ...props,
    children: children.map(child => typeof child === 'object' ? child : {
      type: 'TEXT_ELEMENT',
      props: {
        nodeValue: child, children: []
      }
    })
  }}
}

function createDom(element) {
  const dom = element.type === 'TEXT_ELEMENT'
            ? document.createTextNode('')
            : document.createElement(element.type)
  
  const isProperty = key => key !== 'children'
  Object.keys(element.props).filter(isProperty).forEach(name => {
    dom[name] = element.props[name]
  })

  return dom
}

// 确定下一个待渲染的工作单元
function render(element, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element]
    }
  }
}

// 事件循环，在浏览器空闲时不停的执行
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  requestIdleCallback(workLoop)
}

function performUnitOfWork(fiber) {
  // 1.将元素添加到dom节点中去
  if (!fiber.dom) fiber.dom = createDom(fiber)
  if (fiber.parent) fiber.parent.dom.appendChild(fiber.dom)

  // 2.为元素的所有子元素创建工作单元
  const elements = fiber.props.children
  let index = 0
  let prevSibling = null

  while (index < elements.length) {
    const element = elements[index]
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }

    if (index === 0) fiber.child = newFiber
    else prevSibling.sibling = newFiber

    prevSibling = newFiber
    index++
  }

  // 3.选择下一个待执行的工作单元
  if (fiber.child) return fiber.child

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling

    nextFiber = nextFiber.parent
  }
}

let nextUnitOfWork = null
requestIdleCallback(workLoop)

// 1.创建元素
const element = createElement(
  'h1',
  { id: 'foo' },
  '你好',
  createElement('div', null, '不太好'),
  createElement('div', null, '真的不好么？')
)

// 2.渲染元素
const container = document.getElementById('root')
render(element, container)
