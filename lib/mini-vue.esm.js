// 创建vnode 这里的type就是app内部的对象
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null,
    };
    // 如果孩子是字符串，代表就是TEXT_CHILDREN类型，用 | 修改
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        // 如果是数组，代表就是ARRAY_CHILDREN类型，用 | 修改
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}

const publicPropertiesMap = {
    // 如果Key是$el，返回el
    $el: (instance) => instance.vnode.el,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // setupState 解构出 进行代理
        const { setupState } = instance;
        // 如果是setupState里的值，返回代理值
        if (key in setupState) {
            return setupState[key];
        }
        // 通过key去找map里面有没有这个方法，
        const publicGetter = publicPropertiesMap[key];
        // 如果有，就调用这个方法
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

// 创建组件实例对象
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {}
    };
    return component;
}
function setupComponent(instance) {
    // initProps()
    // initSlots()
    // 初始化setup 处理有状态的组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 通过实例的vnode获取type，type就是对象的内容
    const component = instance.type;
    // ctx proxy代理对象，把instance传过去 PublicInstanceProxyHandlers
    instance.proxy = new Proxy({
        _: instance
    }, PublicInstanceProxyHandlers);
    // 解构出setup
    const { setup } = component;
    // 如果有setup
    if (setup) {
        // 调用setup，并将返回值给setupResult
        const setupResult = setup();
        // 对结果判断，可能是函数可能是对象,object,function
        handleSetupResult(instance, setupResult);
    }
}
// 对结果判断，可能是函数可能是对象,object,function
function handleSetupResult(instance, setupResult) {
    // todo function
    if (typeof setupResult === 'object') {
        instance.setupState = setupResult;
    }
    // 处理render函数的
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const component = instance.type;
    // if(component.render) {
    instance.render = component.render;
    // }
}

function render(vnode, container) {
    // 调用patch
    patch(vnode, container);
}
function patch(vnode, container) {
    // 结构出shapeFlag
    const { shapeFlag } = vnode;
    // 通过&运算查找，看看是否是ElEMENT类型
    if (shapeFlag & 1 /* ELEMENT */) {
        // 如果是element
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        // 通过&运算查找，看看是否是STATEFUL_COMPONENT类型
        // 处理组件
        processComponent(vnode, container);
    }
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const { type, props, children, shapeFlag } = vnode;
    // 将el存一份在vnode上，以便$el访问
    const el = (vnode.el = document.createElement(type));
    // children 可能是string ,array
    // 通过&运算查找，如果是TEXT_CHILDREN类型
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
        // 通过&运算查找，如果是ARRAY_CHILDREN类型
        // 如果是数组 遍历数组，进行patch，此时容器为el
        mountChildren(vnode, el);
    }
    // 遍历设置属性 还要对里面的方法进行处理
    for (const key in props) {
        const val = props[key];
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        el.setAttribute(key, val);
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    //  循环挂载孩子
    vnode.children.forEach((v) => {
        patch(v, container);
    });
}
function mountComponent(initialVnode, container) {
    // 1. 创建组件实例，用以存储各种属性 createComponentInstance
    // 2. 初始化组件实例 setupComponent
    // 3. 副作用函数挂载 setupRenderEffect
    const instance = createComponentInstance(initialVnode);
    // 初始化组件实例
    setupComponent(instance);
    setupRenderEffect(instance, initialVnode, container);
}
function setupRenderEffect(instance, initialVnode, container) {
    // 取出代理对象
    const { proxy } = instance;
    // 调用render函数 subTree就是vnode树
    // 将this指向代理对象，因此this.msg可用
    const subTree = instance.render.call(proxy);
    // 再patch递归
    patch(subTree, container);
    // 所有的element mount之后 这时候的subTree就是根组件了
    initialVnode.el = subTree.el;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // componet -> vnode
            // 所有的逻辑操作都会基于vnode做处理
            // 将根组件转换为vnode
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
