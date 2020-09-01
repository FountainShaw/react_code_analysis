// const element = React.createElement('div', { id: 'title' }, '黑神话：悟空')
// const container = document.getElementById('root')
// ReactDOM.render(element, container)




// 第一步中，其实是通过调用React这个对象的createElement方法，进而生成了一个特定的对象
// 这个对象包括了几个要素：1.标签名称；2.标签属性；3.子代元素
// 但是归结起来其实只有两个，第一是type，第二是props

const element = {
  type: 'div',
  props: {
    id: 'title',
    children: '黑神话：悟空'
  }
}

// 这里将子代元素作为props的一个特殊属性，虽然这里是一个text，但是更通用的情况下他应该也是一个react元素，也可以说text事实上也是一个特殊的react元素




// 第二步没什么好说的
const container = document.getElementById('root')




// 第三步中用到了一个比较重要的方法render，他是ReactDOM这个对象的一个方法
// 他实际的作用是将我们生成的react元素，渲染到指定的DOM节点中去
// 和createElement一样，我们怎么去解构这个render方法呢？
// 其实就是将上面封装好的element对象，按照特定方式塞到DOM节点中去

const node = document.createElement(element.type)
node.id = element.props.id

const text = document.createTextNode('')
text.nodeValue = element.props.children

node.appendChild(text)
container.appendChild(node)




// 如果简单来说，忽略大部分细节，这就是react或者其他一些前端框架渲染的最基础的逻辑
// 但是明显react肯定不止做了这么点东西
// 下面，我将从以下几个方面来进一步扩展，深入说明react框架源码的实现逻辑

// 1.真正去实现一个createElement方法
// 2.尝试着去了解render方法的功能
// 3.处理一些比较棘手的渲染问题
// 4.我们经常听到的Fiber到底是什么
// 5.更进一步的优化
// 6.函数组件和状态的一些说明
