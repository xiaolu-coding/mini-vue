'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
// 创建vnode 这里的type就是app内部的对象
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
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

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
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

// 用来存放effect实例的全局变量
let activeEffect;
// 用来判断是否收集依赖的全局变量
let shouldTrack;
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
function effect(fn, options = {}) {
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
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
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
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
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
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    // 如果Key是$el，返回el
    $el: (instance) => instance.vnode.el,
    // 如果Key是$slots，返回slots
    $slots: (instance) => instance.slots
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
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
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
    // 初始化props，此时instance上有props
    initProps(instance, instance.vnode.props);
    // 初始化slots，此时instance上有slots
    // PublicInstanceProxyHandlers里就能拿到slots
    initSlots(instance, instance.vnode.children);
    // 初始化setup 处理有状态的组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 通过实例的vnode获取type，type就是对象的内容
    const component = instance.type;
    // ctx proxy代理对象，把instance传过去 PublicInstanceProxyHandlers
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
        // 调用完setup后 设为null
        setCurrentInstance(null);
        // 对结果判断，可能是函数可能是对象,object,function
        handleSetupResult(instance, setupResult);
    }
}
// 对结果判断，可能是函数可能是对象,object,function
function handleSetupResult(instance, setupResult) {
    // todo function  
    if (typeof setupResult === "object") {
        // 做一层ref代理，可以通过this.count 直接获取到count.value的值
        instance.setupState = proxyRefs(setupResult);
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
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
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
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // componet -> vnode
                // 所有的逻辑操作都会基于vnode做处理
                // 将根组件转换为vnode
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container) {
        // 调用patch
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentComponent, anchor) {
        // 结构出shapeFlag
        const { type, shapeFlag } = n2;
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
    function processText(n1, vnode, container) {
        // 解构出children,此时的children就是text节点的文本内容
        const { children } = vnode;
        // 元素记得复制一份给el，方便之后的diff
        const textNode = (vnode.el = document.createTextNode(children));
        // 挂载
        container.append(textNode);
    }
    // 如果是Fragment，就直接去挂载孩子们，孩子们里面patch触发后面的process那些
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        mountComponent(n2, container, parentComponent, anchor);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        // n1不存在时，是挂载初始化
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
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
        //  循环挂载孩子
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function mountComponent(initialVnode, container, parentComponent, anchor) {
        // 1. 创建组件实例，用以存储各种属性 createComponentInstance
        // 2. 初始化组件实例 setupComponent
        // 3. 副作用函数挂载 setupRenderEffect
        const instance = createComponentInstance(initialVnode, parentComponent);
        // 初始化组件实例
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container, anchor);
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
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
        for (let i = 0; i < children.length; i++) {
            // 通过el拿到真实的dom元素，然后卸载
            const el = children[i].el;
            // remove
            hostRemove(el);
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
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
                    for (let j = s2; j < e2; j++) {
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
                    // 如果这时候newIndex有值，代表老节点在新节点中有相同的，因此将对应的新老节点patch
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
        }
    }
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        effect(() => {
            if (!instance.isMounted) {
                // 取出代理对象
                const { proxy } = instance;
                // 调用render函数 subTree就是vnode树
                // 将this指向代理对象，因此this.msg可用 subTree复制一份以便后面更新的时候能取到
                const subTree = (instance.subTree = instance.render.call(proxy));
                // 再patch 初始化
                patch(null, subTree, container, instance, anchor);
                // 所有的element mount之后 这时候的subTree就是根组件了
                initialVnode.el = subTree.el;
                // 初始化挂载后，为true，之后进来都是更新逻辑
                instance.isMounted = true;
            }
            else {
                const { proxy } = instance;
                // 拿到当前的subTree
                const subTree = instance.render.call(proxy);
                // 拿到之前的subTree
                const PrevSubTree = instance.subTree;
                // 把当前的subTree给之前的subTree，以便后来的更新
                instance.subTree = subTree;
                // 更新
                patch(PrevSubTree, subTree, container, instance, anchor);
            }
        });
    }
    return {
        // 为了传render函数给createApp使用
        createApp: createAppAPI(render),
    };
}

// 创建元素 将方法接口通过createRenderer传过去，这就是custom renderer的核心，可以自定义渲染器
function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
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
    // container.append(el)
    // 默认值为null，当不传anchor时，是默认插后面，传anchor时，插前面
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
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
    // createRenderer返回的是 createApp: createAppAPI()，因此这里是调用createAppAPI
    return renderer.createApp(...args);
}

exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVnode = createTextVnode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlots = renderSlots;
