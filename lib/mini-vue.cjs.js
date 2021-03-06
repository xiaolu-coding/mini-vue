'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const isString = (val) => typeof val === 'string';
const hasChanged = (newValue, oldValue) => {
    return !Object.is(newValue, oldValue);
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

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
// 创建vnode 这里的type就是app内部的对象
function createVNode(type, props, children) {
    console.log(`createVNode  ----- 为 ${isObject(type) ? type.template : type} 创建vnode`);
    const vnode = {
        type,
        props,
        children,
        component: null,
        key: props && props.key,
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
    // 当是组件类型 并且 children是 object时，是slots
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVnode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        // 如果是函数
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

// 用来存放effect实例的全局变量
let activeEffect;
// 用来判断是否收集依赖的全局变量
let shouldTrack = false;
class reactiveEffect {
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // 1. 会收集依赖，通过shouldTrack来区分
        // 如果active是false，代表stop了
        if (!this.active) {
            // 返回fn调用之后的返回值，这时候的shouldTrack为false，
            // 因此调用fn，不会收集依赖
            return this._fn();
        }
        shouldTrack = true;
        // 通过activeEffect拿到effect实例，this是effect实例，然后push到dep中
        activeEffect = this;
        const result = this._fn();
        shouldTrack = false;
        return result;
    }
    stop() {
        // active防止一直清除
        if (this.active) {
            if (this.onStop) {
                this.onStop();
            }
            cleanupEffect(this);
            this.active = false;
        }
    }
}
// 遍历deps删除内部的effect
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
function isTracking() {
    console.log(`isTracking --- 判断是否需要收集依赖`);
    // 是否需要收集依赖，stop里面的get set ++操作
    // if (!shouldTrack) return
    // 如果没有effect，就不需要收集
    // if (!activeEffect) return
    return shouldTrack && activeEffect !== undefined;
}
// 结构是这样的 target: {key: [effect]}
// effect.run() 执行内部的fn
// track的功能就是通过这种结构添加对应的effect依赖
const targetMap = new WeakMap();
function track(target, key) {
    // 如果不是track中的状态，就返回
    if (!isTracking())
        return;
    console.log("track");
    // 获取到target的depsMap 为map类型
    let depsMap = targetMap.get(target);
    // 初始化
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    // 获取到key的dep， 为set类型
    let dep = depsMap.get(key);
    // 初始化
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    // 如果dep中已经有同样的effect 返回
    if (dep.has(activeEffect))
        return;
    console.log('trackEffects ----- 收集依赖');
    // 添加依赖，activeEffect是全局变量保存的effect实例
    dep.add(activeEffect);
    // 挂载deps在effect实例上，以便在stop里面可以清除
    activeEffect.deps.push(dep);
}
function triggerEffects(dep) {
    // 遍历拿到dep中的effect实例，执行实例的run方法去执行fn
    for (const effect of dep) {
        // 如果有scheduler，执行scheduler
        if (effect.scheduler) {
            console.log("triggerEffects ----- 以scheduler方式触发依赖");
            effect.scheduler();
        }
        else {
            console.log("triggerEffects ----- 以fun方式触发依赖");
            effect.run();
        }
    }
}
function trigger(target, key) {
    console.log('trigger');
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    // 触发依赖
    triggerEffects(dep);
}
function effect(fn, options = {}) {
    console.log('effect  ------ 创建更新机制');
    // fn是函数
    const _effect = new reactiveEffect(fn, options.scheduler);
    // 通过Object.assign将otpions放进来
    extend(_effect, options);
    // _effect.onStop = options.onStop
    // 通过run方法去执行内部的fn
    _effect.run();
    const runner = _effect.run.bind(_effect);
    // 保存effect在runner上。给stop用
    runner.effect = _effect;
    // 返回一个runner方法，当调用它时，会再次执行fn，并返回fn返回值
    return runner;
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
        // 如果不是只读，就track收集依赖
        if (!isReadOnly) {
            track(target, key);
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
    console.log('reactive');
    // baseHanlders是get set对象
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    console.log('readonly');
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
function createReactiveObject(target, baseHandlers) {
    console.log('createReactiveObject   ---- 创建响应式对象');
    // 如果不是对象
    if (!isObject(target)) {
        console.warn(`target ${target} 必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

class RefImpl {
    constructor(value) {
        // 判断是不是ref得标记
        this.__v_isRef = true;
        // 为了防止是对象相比，再保存一份
        this._rawValue = value;
        // 如果value是对象，就要reactive
        this._value = convert(value);
        this.dep = new Set();
    }
    // get时收集依赖
    get value() {
        console.log(`get value  ---- ${this._value} 这个值触发get `);
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        console.log(`set value  ---- ${this._value} 变为 ${newValue} 时触发set`);
        // 判断值是否改变,如果值变了，才需要触发通知
        // 用保存的一份比较
        if (hasChanged(newValue, this._rawValue)) {
            // 要先去修改value值，再通知
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    console.log(`trackRefValue  ---- 要收集依赖的值: ${ref._value}`);
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    console.log(`ref --- 为 ${value} 创建ref响应式对象`);
    return new RefImpl(value);
}
function isRef(ref) {
    // 如果没有的情况肯定是undefined，因此要!!转
    return !!ref.__v_isRef;
}
function unRef(ref) {
    // 看看是不是ref对象，如果是，返回value，不是，返回本身
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRef) {
    return new Proxy(objectWithRef, {
        get(target, key) {
            // 将get的值经过unRef后返回
            return unRef(Reflect.get(target, key));
        },
        set(target, key, newValue) {
            // 如果是ref类型，并且新值不是ref
            if (isRef(target[key]) && !isRef(newValue)) {
                // 要value
                return target[key].value = newValue;
            }
            else {
                return Reflect.set(target, key, newValue);
            }
        }
    });
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
    console.log('initProps ----- 初始化props');
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    // 如果Key是$el，返回el
    $el: (instance) => instance.vnode.el,
    // 如果Key是$slots，返回slots
    $slots: (instance) => instance.slots,
    $props: (instance) => instance.props,
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

function initSlots(instance, children) {
    console.log('initSlots ----- 初始化slots');
    // 解构vnode，判断是否是slot类型
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        // 处理slots
        normalizeObjectSlots(instance.slots, children);
    }
}
function normalizeObjectSlots(slots, children) {
    // 遍历children对象，将对象传给slots，内部做数组化处理，给renderSlots用
    for (const key in children) {
        const value = children[key];
        // 因为value是函数 slots[key]参数作为value的参数去执行
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
// 数组化处理
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

// 创建组件实例对象
function createComponentInstance(vnode, parent) {
    console.log("createComponentInstance  --- 创建组件实例对象");
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        next: null,
        emit: () => { },
        parent,
        provides: parent ? parent.provides : {},
        isMounted: false,
        subTree: {},
    };
    // 将emit函数赋值给组件实例的emit 将compoent作为第一个参数传过去
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    console.log("setupComponent  --- 初始化组件实例");
    // 初始化props，此时instance上有props
    initProps(instance, instance.vnode.props);
    // 初始化slots，此时instance上有slots
    // PublicInstanceProxyHandlers里就能拿到slots
    initSlots(instance, instance.vnode.children);
    // 初始化setup 处理有状态的组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    console.log("setupStatefulComponent ---- 执行setup方法");
    // 通过实例的vnode获取type，type就是对象的内容
    const component = instance.type;
    // ctx proxy代理对象，把instance传过去 PublicInstanceProxyHandlers
    console.log('创建实例的proxy代理对象');
    instance.proxy = new Proxy({
        _: instance,
    }, PublicInstanceProxyHandlers);
    // 解构出setup
    const { setup } = component;
    // 如果有setup
    if (setup) {
        // 将instance传给全局变量currentInstance，以便getCurrentInstance在setup中获取到
        setCurrentInstance(instance);
        // 调用setup，并将返回值给setupResult
        // 传入浅只读的Props,可以在setup中得到这个参数
        // 传入emit
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        console.log('调用了setup方法,返回值为: ', setupResult);
        // 调用完setup后 设为null
        setCurrentInstance(null);
        // 对结果判断，可能是函数可能是对象,object,function
        handleSetupResult(instance, setupResult);
    }
}
// 对结果判断，可能是函数可能是对象,object,function
function handleSetupResult(instance, setupResult) {
    console.log("handleSetupResult --- 对setup方法的返回值做处理");
    // todo function  
    if (typeof setupResult === "object") {
        // 做一层ref代理，可以通过this.count 直接获取到count.value的值
        instance.setupState = proxyRefs(setupResult);
    }
    // 处理render函数的
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    console.log('finishComponentSetup --- 通过compile方法得到render函数(Vue3里面对Vue2做兼容处理:applyOptions)');
    const component = instance.type;
    if (compiler && !component.render) {
        if (component.template) {
            component.render = compiler(component.template);
        }
    }
    // if(component.render) {
    instance.render = component.render;
    // }
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

function provide(key, value) {
    // 获取当前组件实例
    const currentInstance = getCurrentInstance();
    // 检测是否存在，有可能不是在setup内部
    if (currentInstance) {
        // 解构出provides，并赋值
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        // 初始化provides 因为刚开始组件初始化的时候，provides就是parent.provides，初始化之后才进行provides[key] = value
        // 下次再进来就不一样了，不会走这里了
        if (provides === parentProvides) {
            // 创建原型链，将provides的proto指向parentProvides
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 获取当前组件实例
    const currentInstance = getCurrentInstance();
    // 如果当前组件实例存在
    if (currentInstance) {
        // 获取父组件的provides
        const parentProvides = currentInstance.parent.provides;
        // 去parentProvides中查找key，原型链查找
        if (key in parentProvides) {
            // 如果有就返回
            return parentProvides[key];
        }
        else if (defaultValue) {
            // 处理默认值，当默认值是函数类型时，返回函数调用结果
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            else {
                // 直接返回默认值
                return defaultValue;
            }
        }
    }
}

function createAppAPI(render) {
    console.log('createAppAPI  ------ 返回给renderer渲染器对象的createApp方法');
    return function createApp(rootComponent) {
        console.log('createApp  ------- renderer渲染器调用的createApp方法');
        return {
            mount(rootContainer) {
                console.log('mount  ------ 执行挂载');
                // componet -> vnode
                // 所有的逻辑操作都会基于vnode做处理
                // 将根组件转换为vnode
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

function shouldUpdateComponent(prevVnode, nextVnode) {
    const { props: prevProps } = prevVnode;
    const { props: nextProps } = nextVnode;
    // 遍历新的节点的props，去对比老节点props，如果有不一样的，就返回true，就需要执行update
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    // 如果props都一样 返回false，不用执行update
    return false;
}

const queue = [];
let isFlushPending = false;
const p = Promise.resolve();
// nextTick返回微任务 就可以拿到视图更新后的了 因为之前的微任务肯定已经执行完了，才会执行这个微任务
function nextTick(fn) {
    console.log('nextTick ---- 创建微任务');
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    console.log('queueJobs ----- 更新任务队列');
    // 如果队列里没有job，就添加进去
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    console.log('queueFlush  ------ 以nextTick微任务的方式去执行任务队列');
    if (isFlushPending)
        return;
    // 只创建一次promise
    isFlushPending = true;
    // 微任务
    nextTick(flushJobs);
}
function flushJobs() {
    console.log("flushJobs  ------ 取出队列头部任务执行");
    isFlushPending = false;
    let job;
    // 取出队列头部任务执行
    while ((job = queue.shift())) {
        job && job();
    }
}

function createRenderer(options) {
    console.log('createRenderer ------ 创建renderer渲染器对象');
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container) {
        console.log('render ----- 调用render,触发patch');
        // 调用patch
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentComponent, anchor) {
        // 结构出shapeFlag
        const { type, shapeFlag } = n2;
        console.log('patch ----- 根据type类型选择相应的process方法, 此次类型为:', type);
        // Fragment 只渲染children
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // 通过&运算查找，看看是否是ElEMENT类型
                if (shapeFlag & 1 /* ELEMENT */) {
                    // 如果是element
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    // 通过&运算查找，看看是否是STATEFUL_COMPONENT类型
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processText(n1, n2, container) {
        console.log('processText  ------ 处理text节点');
        // 解构出children,此时的children就是text节点的文本内容
        const { children } = n2;
        // 元素记得复制一份给el，方便之后的diff
        const textNode = (n2.el = document.createTextNode(children));
        // 挂载
        container.append(textNode);
    }
    // 如果是Fragment，就直接去挂载孩子们，孩子们里面patch触发后面的process那些
    function processFragment(n1, n2, container, parentComponent, anchor) {
        console.log('processFragment ------ 处理Fragment节点');
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        console.log('processComponent ----- 处理组件类型节点');
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        console.log('processElement ----- 处理标签类型节点');
        // n1不存在时，是挂载初始化
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        console.log('mountElement ----- 挂载标签类型节点');
        const { type, props, children, shapeFlag } = vnode;
        // 将el存一份在vnode上，以便$el访问
        const el = (vnode.el = hostCreateElement(type));
        // children 可能是string ,array
        // 通过&运算查找，如果是TEXT_CHILDREN类型
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            // 通过&运算查找，如果是ARRAY_CHILDREN类型
            // 如果是数组 遍历数组，进行patch，此时容器为el
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        // 遍历设置属性 还要对里面的方法进行处理
        for (const key in props) {
            const val = props[key];
            // 处理prop
            hostPatchProp(el, key, null, val);
        }
        // 插入节点
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        console.log('mountChildren  ----- 挂载孩子们,其实就是对children执行patch');
        //  循环挂载孩子
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function mountComponent(initialVnode, container, parentComponent, anchor) {
        console.log('mountComponent ------ 挂载组件类型');
        // 1. 创建组件实例，用以存储各种属性 createComponentInstance
        // 2. 初始化组件实例 setupComponent
        // 3. 副作用函数挂载 setupRenderEffect
        // 给虚拟节点也复制一份组件实例，为了在后面更新时拿到
        const instance = (initialVnode.component = createComponentInstance(initialVnode, parentComponent));
        // 初始化组件实例
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container, anchor);
    }
    function updateComponent(n1, n2) {
        console.log('updateComponent ----- 更新组件');
        // 从n1取出组件实例赋值给n2和instance 因为n2是没有compoent的，但是n2之后又会作为老节点
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            // 存储新节点
            instance.next = n2;
            // 执行runner方法，也就是调用传入的函数 也就是执行了组件的render函数
            instance.update();
        }
        else {
            // 不需要更新的话，还是要保存el和vnode以便下次更新作为老节点使用
            n2.el = n1.el;
            n2.vnode = n2;
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log('patchElement   ----- 更新标签类型节点');
        // update
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // el是存在Instance里的，给n2也复制一份，因为下一次更新n2就是n1了
        const el = (n2.el = n1.el);
        // 更新孩子
        patchChildren(n1, n2, el, parentComponent, anchor);
        // 更新props属性
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        console.log('patchChildren ----- 更新孩子');
        const prevShapeFlag = n1.shapeFlag;
        const newShpaeFlag = n2.shapeFlag;
        const oldChildren = n1.children;
        const newChildren = n2.children;
        if (newShpaeFlag & 4 /* TEXT_CHILDREN */) {
            // 如果新的是文本类型 老的是数组类型，那么要卸载掉老的children，再text
            if (prevShapeFlag & 8 /* ARRAY_CHILDREN */) {
                // 卸载老的children
                ummountChildren(n1.children);
            }
            // 1. 新的文本类型，老的数组类型，卸载掉老的之后，oldChildren 肯定!== newChildren，所以会走这
            // 2. 也有可能是两者都是文本类型，然后文本值不同，直接设置文本值
            if (oldChildren !== newChildren) {
                // 设置新的文本
                hostSetElementText(container, newChildren);
            }
        }
        else {
            if (prevShapeFlag & 4 /* TEXT_CHILDREN */) {
                // 清空文本
                hostSetElementText(container, "");
                // 挂载孩子
                mountChildren(newChildren, container, parentComponent, anchor);
            }
            else {
                // array to array的情况 diff
                patchKeyedChildren(oldChildren, newChildren, container, parentComponent, anchor);
            }
        }
    }
    function patchProps(el, oldProps, newProps) {
        console.log('patchProps  ---- 更新属性');
        // 只有不一样才需要对比
        if (oldProps !== newProps) {
            // 遍历新props
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                // 如果不同，就修改
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            // 当不是空对象时，才要检测
            if (oldProps !== EMPTY_OBJ) {
                // 当老的props里的key不在新的props里，删除属性
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        // 第四个参数为null时，删除
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function ummountChildren(children) {
        console.log('ummountChildren');
        for (let i = 0; i < children.length; i++) {
            // 通过el拿到真实的dom元素，然后卸载
            const el = children[i].el;
            // remove
            hostRemove(el);
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        console.log('patchKeyedChildren');
        const l2 = c2.length;
        let i = 0; // i是指针，从左侧开始
        let e1 = c1.length - 1; // e1是c1的尾部
        let e2 = l2 - 1; // e2是c2的尾部
        function isSameNodeType(n1, n2) {
            // 判断是否相同节点，可以从type和key来判断
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 左侧对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            // 如果是相同类型的节点
            if (isSameNodeType(n1, n2)) {
                // 递归遍历
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // 右侧对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]; // n1为尾部
            const n2 = c2[e2]; // n2为尾部
            if (isSameNodeType(n1, n2)) {
                // 递归遍历
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            // 右侧对比，尾部--
            e1--;
            e2--;
        }
        // 新的比老的多 创建
        if (i > e1) {
            // 指针大于了e1，代表新的比老的多
            if (i <= e2) {
                // 并且指针小于等于e2，代表新的增加了 此时的e2 + 1是需要增加的锚点的位置
                const nextPos = e2 + 1;
                // 如果锚点位置<c2的长度，获取el，不然就是null，插后面
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    // 因此调用Patch 第一个参数为Null,为挂载 anchor锚点，有的话就是插前面
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 老的比新的长
            while (i <= e1) {
                // 删除老的节点
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 乱序的部分
            // 中间对比
            let s1 = i; // i是指针，也就是经过双端对比后得到的左端的索引值
            let s2 = i;
            const toBePatched = e2 - s2 + 1; // 经过双端对比后剩下的新节点的数量
            let patched = 0; // 记录新节点patch的次数，
            const keyToNewIndexMap = new Map();
            // 定宽数组，长度为新节点的数量
            const newIndexToOldIndexMap = new Array(toBePatched);
            // 是否去移动
            let moved = false;
            let maxNewIndexSoFar = 0;
            // 初始化newIndexToOldIndexMap
            for (let i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            // 遍历经过双端对比后剩下的新节点，并将其转换成map映射的方式
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                // 转换成 E => 2  D => 3这种，通过key值得到相应索引
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 遍历经过双端对比后剩下的老节点 e1是老节点右端的索引值
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                // 如果新节点patch次数大于新节点数量，直接把后续老节点都删除
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    // 直接把后续老节点都删除，不用执行下面的代码
                    continue;
                }
                let newIndex;
                // 有key时 使用map映射
                if (prevChild.key != null) {
                    // 看老节点是否在新节点的map上存在
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 没有key时，遍历
                    for (let j = s2; j <= e2; j++) {
                        // 遍历查找新节点中是否有与老节点相同的节点
                        if (isSameNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            // 找到就跳出
                            break;
                        }
                    }
                }
                // 如果这时候的newIndex还没被赋值，代表老节点在新节点中没有，因此要删除
                if (newIndex === undefined) {
                    hostRemove(prevChild.el);
                }
                else {
                    // 记录索引和最大索引
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        // 如果新的索引比最大的小，那么肯定是需要移动的，比如 1 2 3 -> 1 3 2
                        moved = true;
                    }
                    // 这时候的newIndex是和老节点相同的新节点的双端对比前索引值，newIndex-s2为双端对比后的索引值
                    newIndexToOldIndexMap[newIndex - s2] = i + 1; // i+1避免为0的情况，为0时，是需要增加新节点
                    // 如果这时候newIndex有值，代表老节点在新节点中有相同的，因此将对应的新老节点patch
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            // 得到最长递增子序列  根据是否移动取值
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            // 倒序遍历，将稳定的增长子序列的节点插在稳定节点上
            // 比如  a b c d e f g  ->  a b e c d f g
            // 那就是把d 插到f前，再把c插到d前，然后移动e
            for (let i = toBePatched - 1; i >= 0; i--) {
                // i是双端对比后的索引，加上s2也就是左边的索引
                // nextIndex就是双端对比前的索引
                const nextIndex = i + s2;
                // nextChild就是相应的节点
                const nextChild = c2[nextIndex];
                // 锚点，倒着向前插
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                // 如果是0的话，代表老节点里没有，要新创建
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 如果需要移动
                    // j < 0，肯定不同了
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 如果不相同，插入
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        // 如果相同，不需要移动
                        j--;
                    }
                }
            }
        }
    }
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        console.log('setupRenderEffect ---- 创建更新函数，创建更新机制，视图更新');
        // effect会返回runner，由update接收，当再次调用update时，会继续调用传入的函数
        instance.update = effect(() => {
            console.log('update ---- 执行update更新函数,首次视图更新');
            if (!instance.isMounted) {
                // 取出代理对象
                const { proxy } = instance;
                // 调用render函数 subTree就是vnode树
                // 将this指向代理对象，因此this.msg可用 subTree复制一份以便后面更新的时候能取到
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                // 再patch 初始化
                patch(null, subTree, container, instance, anchor);
                // 所有的element mount之后 这时候的subTree就是根组件了
                initialVnode.el = subTree.el;
                // 初始化挂载后，为true，之后进来都是更新逻辑
                instance.isMounted = true;
                console.log('首次挂载完毕');
            }
            else {
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    // 在更新之前，去改变组件实例上的props属性
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                // 拿到当前的subTree
                const subTree = instance.render.call(proxy, proxy);
                // 拿到之前的subTree
                const PrevSubTree = instance.subTree;
                // 把当前的subTree给之前的subTree，以便后来的更新
                instance.subTree = subTree;
                // 更新
                patch(PrevSubTree, subTree, container, instance, anchor);
                console.log("更新完毕");
            }
        }, {
            // 通过scheduler将instance.update加入异步队列，也就是上面的函数不是同步执行的了
            scheduler() {
                // 加入队列
                queueJobs(instance.update);
            }
        });
    }
    return {
        // 为了传render函数给createApp使用
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVnode) {
    console.log('updateComponentPreRender ---- 更新组件实例上的props属性');
    // 将新的节点作为下一次更新的老节点
    instance.vnode = nextVnode;
    // 将新节点的next置为null
    instance.next = null;
    // 赋值props
    instance.props = nextVnode.props;
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

// 创建元素 将方法接口通过createRenderer传过去，这就是custom renderer的核心，可以自定义渲染器
function createElement(type) {
    console.log('createElement  ----- 创建元素');
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    console.log('patchProp ----- 更新属性');
    if (isOn(key)) {
        // 将on后面的转小写
        const event = key.slice(2).toLowerCase();
        // 添加事件
        el.addEventListener(event, nextVal);
    }
    else {
        // undefine和null的时候，就删除属性
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(child, parent, anchor) {
    console.log('insert ----- 插入元素到dom');
    // container.append(el)
    // 默认值为null，当不传anchor时，是默认插后面，传anchor时，插前面
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    console.log('remove ----- 删除元素');
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    console.log('setElementText ----- 设置元素文本');
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    console.log('createApp ----- 调用renderer渲染器对象的createApp方法');
    // createRenderer返回的是 createApp: createAppAPI()，因此这里是调用createAppAPI
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    h: h,
    renderSlots: renderSlots,
    createTextVnode: createTextVnode,
    createElementVNode: createVNode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    provide: provide,
    inject: inject,
    createRenderer: createRenderer,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref,
    proxyRefs: proxyRefs
});

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperMapName = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode',
};

function generate(ast) {
    console.log('generate ----- 将vnode转换为render函数');
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(",");
    push(`function ${functionName}(${signature}) {`);
    push("return ");
    genNode(ast.codegenNode, context);
    push("}");
    return {
        code: context.code,
    };
}
// 处理导入的toDislayString
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = "Vue";
    // 转换
    const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`);
    }
    push("\n");
    push("return ");
}
function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
function genNode(node, context) {
    if (!node)
        return;
    switch (node.type) {
        case 3 /* TEXT */:
            genText(node, context);
            break;
        case 0 /* INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* SIMPLE_EXPRESSION */:
            genExpression(node, context);
        case 2 /* ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    if (!children)
        return;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    // genNode(children, context)
    push(`)`);
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(', ');
        }
    }
}
function genNullable(args) {
    return args.map(arg => arg || 'null');
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}

function baseParse(content) {
    console.log('parse ---- 将template转换为ast');
    // 转换为 context.source可以拿到content值
    const context = createParserContext(content);
    //
    return createRoot(parseChildren(context, []));
}
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        // 判断是否是{{}}语法
        if (s.startsWith("{{")) {
            // 解析插值语法
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        // 如果node没有值，就是text
        if (!node) {
            node = parseText(context);
        }
        // 推进到nodes
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    // 2.当遇到结束标签的时候
    if (s.startsWith("</")) {
        // 从栈尾开始
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            // 如果标签对了，就true
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    // if (parentTag && s.startsWith(`</${parentTag}>`)) {
    //   return true
    // }
    // 1.source有值的时候。为true，没值的时候false结束
    return !s;
}
function parseInterpolation(context) {
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    // 关闭的}}的index
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    // 推进，干掉{{
    advanceBy(context, openDelimiter.length);
    // 减掉推进前的{{ 2 就是插值语法内部的文本长度
    const rawContentLength = closeIndex - openDelimiter.length;
    // 截取出插值语法中的值 {{message}} -> message
    const rawContent = parseTextData(context, rawContentLength);
    // 去空格 {{ message }} 这种情况
    const content = rawContent.trim();
    // 截取}}后面的
    advanceBy(context, closeDelimiter.length);
    // 返回相应的对象
    return {
        type: 0 /* INTERPOLATION */,
        content: {
            type: 1 /* SIMPLE_EXPRESSION */,
            content,
        },
    };
}
function parseElement(context, ancestors) {
    // 解析括号
    const element = parseTag(context, 0 /* Start */);
    // 栈收集标签
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        // 解析结果的括号
        parseTag(context, 1 /* End */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    return element;
}
function startsWithEndTagOpen(source, tag) {
    return source.startsWith('</') && source.slice(2, 2 + tag.length).toLowerCase() === tag;
}
function parseTag(context, type) {
    // 1.解析 tag
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    // 2.删除处理完成的代码  推进
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    // 如果是结束标签，直接返回
    if (type === 1 /* End */)
        return;
    return {
        type: 2 /* ELEMENT */,
        tag,
    };
}
function parseText(context) {
    // 可能后面会遇到{{，或者直接到最后
    let endIndex = context.source.length;
    let endTokens = ["<", "{{"];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* TEXT */,
        content,
    };
}
function parseTextData(context, length) {
    // 1.获取content内容
    const content = context.source.slice(0, length);
    // 2.推进
    advanceBy(context, content.length);
    return content;
}
// 推进 截取
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* ROOT */,
    };
}
function createParserContext(content) {
    return {
        source: content,
    };
}

function transform(root, options = {}) {
    console.log('transform  ------ 将ast转换为vnode');
    // 全局上下文对象
    const context = createTransformContext(root, options);
    // 1、遍历 深度游侠搜索
    traverseNode(root, context);
    // 2、修改content
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}
function createTransformContext(root, options) {
    // 通过context存储外部传来的函数
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}
function traverseNode(node, context) {
    // 从外部传来的函数
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    // 获取到传入的函数，执行
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case 0 /* INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* ROOT */:
        case 2 /* ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    // 遍历树，深度优先搜索
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}

function transformExpression(node) {
    if (node.type === 0 /* INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    return node.type === 3 /* TEXT */ || node.type === 0 /* INTERPOLATION */;
}

function transformText(node) {
    if (node.type === 2 /* ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            if (Array.isArray(children)) {
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    if (isText(child)) {
                        for (let j = i + 1; j < children.length; j++) {
                            const next = children[j];
                            if (isText(next)) {
                                if (!currentContainer) {
                                    currentContainer = children[i] = {
                                        type: 5 /* COMPOUND_EXPRESSION */,
                                        children: [child],
                                    };
                                }
                                currentContainer.children.push(" + ");
                                currentContainer.children.push(next);
                                children.splice(j, 1);
                                j--;
                            }
                            else {
                                currentContainer = undefined;
                                break;
                            }
                        }
                    }
                }
            }
        };
    }
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* ELEMENT */,
        tag,
        props,
        children,
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* ELEMENT */) {
        return () => {
            // 中检出里层
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            // children
            const children = node.children;
            let vnodeChildren = children[0];
            // const vnodeElement = {
            //   type: NodeTypes.ELEMENT,
            //   tag: vnodeTag,
            //   props: vnodeProps,
            //   children: vnodeChildren,
            // }
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function baseCompile(template) {
    console.log('compile  ----- 将template转换为render函数 其实就是执行parse transform generate');
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

// mini-vue的出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function('Vue', code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

exports.createApp = createApp;
exports.createElementVNode = createVNode;
exports.createRenderer = createRenderer;
exports.createTextVnode = createTextVnode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.renderSlots = renderSlots;
exports.toDisplayString = toDisplayString;
