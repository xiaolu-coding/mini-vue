'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// 创建vnode 这里的type就是app内部的对象
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children
    };
    return vnode;
}

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
    // ctx
    instance.proxy = new Proxy({}, {
        get(target, key) {
            // setupState 解构出 进行代理
            const { setupState } = instance;
            if (key in setupState) {
                return setupState[key];
            }
        }
    });
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

const isObject = (val) => {
    return val !== null && typeof val === 'object';
};

function render(vnode, container) {
    // 调用patch
    patch(vnode, container);
}
function patch(vnode, container) {
    // todo 要先判断类型，再做处理
    if (typeof vnode.type === "string") {
        // 如果是element
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
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
    const { type, props, children } = vnode;
    const el = document.createElement(type);
    // children 可能是string ,array
    // 如果是string，
    if (typeof children === "string") {
        // 赋值
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        // 如果是数组 遍历数组，进行patch，此时容器为el
        mountChildren(vnode, el);
    }
    // 遍历设置属性
    for (const key in props) {
        const val = props[key];
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
function mountComponent(vnode, container) {
    // 1. 创建组件实例，用以存储各种属性 createComponentInstance
    // 2. 初始化组件实例 setupComponent
    // 3. 副作用函数挂载 setupRenderEffect
    const instance = createComponentInstance(vnode);
    // 初始化组件实例
    setupComponent(instance);
    setupRenderEffect(instance, container);
}
function setupRenderEffect(instance, container) {
    // 取出代理对象
    const { proxy } = instance;
    // 调用render函数 subTree就是vnode树 
    // 将this指向代理对象，因此this.msg可用
    const subTree = instance.render.call(proxy);
    // 再patch递归
    patch(subTree, container);
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

exports.createApp = createApp;
exports.h = h;
