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

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
// 转换为驼峰
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
// 首字母转大写
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    // 如果str存在，返回onAdd类型， 不存在返回空字符串
    return str ? "on" + capitalize(str) : "";
};
const isOn = (key) => /^on[A-Z]/.test(key);

// 结构是这样的 target: {key: [effect]}
// effect.run() 执行内部的fn
// track的功能就是通过这种结构添加对应的effect依赖
const targetMap = new WeakMap();
function triggerEffects(dep) {
    // 遍历拿到dep中的effect实例，执行实例的run方法去执行fn
    for (const effect of dep) {
        // 如果有scheduler，执行scheduler
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    // 触发依赖
    triggerEffects(dep);
}

// 直接初始化，后面直接用，优化了，不需要每次都重新返回get
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadOnly = false, shallow = false) {
    return function get(target, key) {
        // 如果是isReactive触发的get，返回!isReadonly
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadOnly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            // 如果是irReadonly触发的get，返回isReadonly
            return isReadOnly;
        }
        const res = Reflect.get(target, key);
        // 如果是浅响应式，直接返回 
        if (shallow) {
            return res;
        }
        // 如果res是对象，递归去reactive
        if (isObject(res)) {
            // 判断是否是readonly 如果是就readonly，如果不是就reactive
            return isReadOnly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    // isReadOnly为true
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key:${key} set 失败，因为 ${target}是readonly`);
        return true;
    },
};
// 修改readonlyhanlders的get为shallowReadonlyGet
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

function reactive(raw) {
    // baseHanlders是get set对象
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
function createReactiveObject(target, baseHandlers) {
    // 如果不是对象
    if (!isObject(target)) {
        console.warn(`target ${target} 必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

// instance是emit.bind(null, component)中传过来的compoent实例
// 然后用户输入的参数从event开始
function emit(instance, event, ...args) {
    // 找到props里面有没有on + event
    const { props } = instance;
    // add -> onAdd  add-foo -> onAddFoo
    const handlerName = toHandlerKey(camelize(event));
    // 先去写一个特定的行为，再慢慢重构为通用行为
    const handler = props[handlerName];
    // 如果存在，就调用 将剩余参数放进来 
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    // 如果Key是$el，返回el
    $el: (instance) => instance.vnode.el,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // setupState 解构出 进行代理
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            // 如果是setupState里的值，返回代理值
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            // 如果是props里的值，返回代理值，也就是this.count
            return props[key];
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
        setupState: {},
        props: {},
        emit: () => { },
    };
    // 将emit函数赋值给组件实例的emit 将compoent作为第一个参数传过去
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // 初始化props，此时instance上有props
    initProps(instance, instance.vnode.props);
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
        // 传入浅只读的Props,可以在setup中得到这个参数
        // 传入emit
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        });
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
        if (isOn(key)) {
            // 将on后面的转小写
            const event = key.slice(2).toLowerCase();
            // 添加事件
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
