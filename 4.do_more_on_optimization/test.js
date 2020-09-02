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
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    }
  }

  nextUnitOfWork = wipRoot
}

// 事件循环，在浏览器空闲时不停的执行
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) commitRoot()

  requestIdleCallback(workLoop)
}

function performUnitOfWork(fiber) {
  // 1.将元素添加到dom节点中去
  if (!fiber.dom) fiber.dom = createDom(fiber)

  // --------------- DEL ----------------------
  // if (fiber.parent) fiber.parent.dom.appendChild(fiber.dom)
  // --------------- DEL ----------------------

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

let wipRoot = null
let nextUnitOfWork = null

function commitWork(fiber) {
  // 当fiber节点不存在时，直接终止操作DOM
  if (!fiber) return

  // 将当前节点添加到其父节点中
  const domParent = fiber.parent.dom
  domParent.appendChild(fiber.dom)

  // 对Fiber的子节点和兄弟节点进行递归，保证Fiber树上所有节点都被添加到DOM中去
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitRoot() {
  // 将所有的nodes添加到DOM中去
  commitWork(wipRoot.child)
  // 重置根节点Fiber树，进入下一次循环
  wipRoot = null
}

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


// 模拟requestIdleCallback工作，将时间放慢
function requestIdleCallback(workLoop) {
  const timer = setTimeout(() => {
      workLoop({ timeRemaining: () => 0.5 })
      clearTimeout(timer)
  }, 50)
}
