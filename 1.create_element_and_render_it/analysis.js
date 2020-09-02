// 正如刚才分析所说，createElement只是创建了一个对象
// 这个创建的对象有type和props两个属性，那么我们要做的只是创建一个含有这两个属性的对象而已

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children,
    }
  }
}

// 理想情况下，这个函数只用做这么多，但是对于一个通用的方法，不可能都在理想情况下使用

// 1.children可能是原始数据类型的值，而不一定是一个react元素，比如之前的例子中的文本
// 因此我们需要对原始值进行一些特殊处理
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    }
  }
}

// 2.将特殊情况融合进之前的方法
function createElement(type, props, ...children) {
  const temp = children.map(
    child => typeof child !== 'object'
          ? createTextElement(child)
          : child
  )

  return {
    type,
    props: { ...props, children: temp }
  }
}


// 用createElement实现以下例子
// <div id='foo'>
//   <a href='https://www.baidu.com'>跳转</a>
//   你好啊！
// </div>

const dom = createElement(
  'div', 
  { id: 'foo' }, 
  createElement('a', { href: 'https://www.baidu.com' }, '跳转'),
  '你好啊！'
)


// 我们最终需要的就是这样，每个节点都是一个标准react元素的数据结构
dom = {
  type: 'div',
  props: {
    id: 'foo',
    children: [
      {
        type: 'a',
        props: {
          href: 'https://www.baidu.com',
          children: [{
            type: 'TEXT_ELEMENT',
            props: {
              nodeValue: '跳转',
              children: [],
            },
          }],
        },
      },
      {
        type: 'TEXT_ELEMENT',
        props: {
          nodeValue: '你好啊！',
          children: [],
        },
      },
    ],
  },
}

// 当然，真正的createElement肯定还有一些其他的逻辑作为补充
// 但是由于我们手动实现react主要关注其核心，边边角角就暂时忽略



// 接下来就是怎么将我们的react元素渲染出来
// render方法说白了就是怎么在指定的DOM节点中处理react元素，比如增、删、改等
// 这里为了方便说明和理解，我们就先只管怎么往DOM中新增react元素
// 其实最符合思维习惯的做法就是，根据react元素的type和props创建DOM的子节点，然后往里添加

function render_1(element, container) {
  const node = document.createElement(element.type)

  container.appendChild(node)
}

// 当然肯定要对其子节点也做相应的处理，直接迭代就可以了
function render_2(element, container) {
  const node = document.createElement(element.type)

  element.props.children.forEach(child => render_2(child, node))

  container.appendChild(node)
}

// 和之前一样，对于原始值类型的子节点，我们也需要单独处理
// 另外，对于除了children之外的props，我们也需要添加到节点中去
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

// 那么，到此处为止，我们基本上就实现了一个简单版的react架构
// 只要把之前写的createElement函数和此处的最后一版render函数合起来使用
// 就可以做到最基本的节点创建与节点渲染了






// 但是明显的，如果react只是搞了这么点东西，他就没资格叫三大主流框架之一了
// 下面我们会说说我们写的这个简单版本react框架有什么问题


// 最大的问题是，如果这个render函数一开始执行，那么他就必定会将所有子节点迭代完才会停止
// 当然，仅仅渲染几层节点，那是没什么问题的，但是我们的DOM树动辄就是几百上千层的
// 再加上每一层都会有好多个子节点，这样算下来，每次执行render函数所带来的消耗是巨大的
// 而且如果在加上动画、用户交互这些因素，那等待或卡顿的时间就更长了


// 所以，我们首先要解决的就是这个反复迭代的问题，即
// element.props.children.forEach(child => render(child, node))
