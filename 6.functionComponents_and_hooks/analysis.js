// 但是，到现在为止，我们还没有见到react中最常见的函数组件和钩子函数等
// 首先，我们先说一下函数组件的问题，以下是一个函数组件示例

function App(props) {
  return createElement('h1', null, `Hello, ${props.name}`)
}

const element = createElement(App, { name: 'Fountain' })

// 以上就是一个最简单的函数组件，我们可以看出，他和我们一般的react原生有点不同：
// 1.没有明显的DOM特征，比如他的第一个参数是一个函数，而不是一个标签字符串
// 2.他的组件内容或者说这个组件的子元素，都是通过函数生成的，而不是之前的props

// 针对以上不同点，我们先检查传入的type是否为函数类型，然后再做其他处理
function performUnitOfWork(fiber) {
  if (fiber.type instanceof Function) updateFunctionComponent(fiber)
  else updateHostComponent(fiber)
  
  if (fiber.child) return fiber.child

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling
    
    nextFiber = nextFiber.parent
  }
}
​
// 对函数组件的特殊处理，我们只要获取到他的子元素，然后将其子元素进行调和就好
// 剩下要做的，是针对此处的fiber，这些工作我们留在commitWork函数中做
function updateFunctionComponent(fiber) {
  const children = [fiber.type(fiber.props)]

  reconcileChildren(fiber, children)
}
​
function updateHostComponent(fiber) {
  if (!fiber.dom) fiber.dom = createDom(fiber)
  
  reconcileChildren(fiber, fiber.props.children)
}

// 这里针对函数组件进行专门处理
// 因为Fiber事实上影响的是DOM的构建，而我们真正使用到Fiber的dom信息的，也就是commitWork
// 所以我们要处理的也就是没有真实DOM节点而产生的影响
// 首先是他的子元素此时没有一个真实的DOM节点作为挂靠点
// 其次我们删除子节点时也会因为没有真实父节点而无法有效的删除
function commitWork(fiber) {
  if (!fiber) return

  // --------------- ADD ----------------------

  // 所以我们首先需要沿着Fiber树向上找到子节点的真实DOM父节点
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) domParentFiber = domParentFiber.parent
  const domParent = domParentFiber.dom

  // --------------- ADD ----------------------

  // --------------- DEL ----------------------
  // const domParent = fiber.parent.dom
  // --------------- DEL ----------------------

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  } else if (fiber.effectTag === 'DELETION') {
    // 如果我们要删除的是一个函数组件，虽然我们可以找到他的有真实DOM节点的祖先组件
    // 但是他本身并不是一个真实的DOM节点，只有他的子节点才是真实挂载在domParent上的
    // 所以，我们还需要一直往下找，直到找到函数组件子节点的真实DOM节点才行

    // --------------- DEL ----------------------
    // domParent.removeChild(fiber.dom)
    // --------------- DEL ----------------------

    // --------------- ADD ----------------------
    commitDeletion(fiber, domParent)
    // --------------- ADD ----------------------
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) domParent.removeChild(fiber.dom)
  else commitDeletion(fiber.child, domParent)
}


// 除了函数组件外，我们最后也是最重要的一个点，就是钩子函数useState
// 首先得明白，useState到底是什么，做了什么
function Counter() {
  const [count, setCount] = useState(1)
  return createElement('h1', {
    onClick: () => setCount(c => c + 1)
  }, `Count: ${count}`)
}
const element = createElement(Counter)
const container = document.getElementById('root')
render(element, container)

// 从例子可以看到，useState是一个函数，可以接收一个参数，并返回一个数组
// 参数可以认为是初始状态，返回值第一个是当前状态值，第二个是可以更新状态值的方法
// 在进行下一步之前，我们得明白，钩子函数是针对函数组件设计的
// 钩子函数状态的变化，其实导致的是函数组件中使用了钩子状态或者相关逻辑的变化
// 因此我们要做的肯定是与函数组件的渲染相关的，总的来说，我们要做的有两点：
// 1.构造出一个钩子函数来，保证函数组件有状态，并且在更新其状态时能触发页面的重绘
// 2.对函数组件的Fiber调和过程进行改造，实际上就是将Fiber与钩子关联起来


// 定义一个当前工作中的Fiber对象，便于在多个函数和运行周期之间调用hook
let wipFiber = null
// 当前Fiber对象中指向的钩子的序列号
let hookIndex = null

function updateFunctionComponent(fiber) {
  // --------------- ADD ----------------------
  
  // 将fiber与钩子函数进行关联，便于下边fiber.type()执行时，能找到其对应的hook
  wipFiber = fiber
  hookIndex = 0
  // 由于每个组件可能有多个状态，所以我们需要用一个数组专门为Fiber做记录
  // 并且下面fiber.type()的执行是针对先一轮渲染的hooks的
  // hook中action使用完毕后，会填充新的action，所以在此需要进行重置
  wipFiber.hooks = []

  // --------------- ADD ----------------------

  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function useState(inital) {
  // 当函数组件调用useState时，我们需要先看看之前Fiber中的hook的状态是什么样的
  const oldHook = wipFiber.alternate
                && wipFiber.alternate.hooks
                && wipFiber.alternate.hooks[hookIndex]
  // 如果之前存在钩子，则直接用之前的，否则就进行初始化
  const hook = { 
    state: oldHook ? oldHook.state : inital,
    // 很有可能在一次重新渲染中，针对一个state，会有多个action，所以需要用数组
    queue: []
  }

  // 当函数组件在updateFunctionComponent中执行，而生成其子元素Fiber时
  // 整个useState会随着函数组件的执行而执行一遍
  // 特别是当由于setState的执行而导致useState重新执行时，此时的actions必不为空
  // 因此，这时会开始改变hook中state的值，从而最终return的结果会发生变化
  const actions = oldHook ? oldHook.queue : []
  actions.forEach(action => hook.state = action(hook.state))

  // 为改变状态而构造的函数，该函数通过重新为根节点和nextUnitOfWork赋值，让workLoop再次运行
  // 对wipRoot、nextUnitOfWork及deletions所做的，只是做了和render函数一样的事而已
  const setState = action => {
    // 先将对状态的改变行为action保存起来，在useState再次执行时，会统一执行action
    // 也就是将改变状态的函数存起来，在重新执行一遍之前的render
    // 进而触发保存的状态改变函数，再导致状态及页面渲染的变化
    // 而此过程中只有函数组件会产生可能的变化，其他的组件都是之前已经有的
    hook.queue.push(action)

    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  // 将本次hook的状态保存到全局钩子对象中，便于下轮渲染周期的使用
  // 而wipFiber.hooks里之前的hook，必须要清空，不然会导致hook调用的混乱
  wipFiber.hooks.push(hook)
  // 为下一个钩子的执行做准备
  hookIndex++

  return [hook.state, setState]
}

// 以上就是所有关于函数组件和钩子函数的说明，让我们重新整合代码
// 当然，如果想进一步的完善这个版本的react，我们也可以根据自己的需要来改造代码
