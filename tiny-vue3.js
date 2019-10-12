let toProxy = new WeakMap()
let toRaw = new WeakMap()

const baseHandler = {
  get(target, key) {
    const res = Reflect.get(target, key)

    // 收集依赖
    track(target, key)

    // 递归寻找
    return typeof res == 'object' ? reactive(res) : res
  },
  set(target, key, val) {
    const info = { oldValue: target[key], newValue: val }
    const res = Reflect.set(target, key, val)

    // 触发更新
    trigger(target, key, info)

    return res
  }
}
function reactive(target) {
  // 查询缓存
  let observed = toProxy.get(target)
  if (observed) {
    return observed
  }
  if (toRaw.get(target)) {
    return target
  }

  observed = new Proxy(target, baseHandler)
  // 设置缓存
  toProxy.set(target, observed)
  toRaw.set(observed, target)

  return observed
}

let effectStack = []
let targetMap = new WeakMap()

// {
//   target: {
//     age: [effect] (set),
//     name: [effect]
//   }
// }
function trigger(target, key, info) {
  // 触发更新
  const depsMap = targetMap.get(target)

  if (depsMap === undefined) {
    return
  }

  const effects = new Set()
  const computedRunners = new Set()
  if (key) {
    let deps = depsMap.get(key)
    deps.forEach(effect => {
      if (effect.computed) {
        computedRunners.add(effect)
      } else {
        effects.add(effect)
      }
    })
  }

  const run = effect => effect()
  effects.forEach(run)
  computedRunners.forEach(run)
}

function track(target, key) {
  let effect = effectStack[effectStack.length - 1]
  if (effect) {
    let depsMap = targetMap.get(target)
    if (depsMap === undefined) {
      // 初始化
      depsMap = new Map()
      targetMap.set(target, depsMap)
    }

    let dep = depsMap.get(key)
    if (dep === undefined) {
      // 初始化
      dep = new Set()
      depsMap.set(key, dep)
    }

    if (!dep.has(effect)) {
      dep.add(effect)
      effect.deps.push(dep)
    }
  }
}

// 存储effect
function effect(fn, options = {}) {
  let e = createReactiveEffect(fn, options)

  // 没有考虑computed
  if (!options.lazy) {
    e()
  }

  return e
}

function createReactiveEffect(fn, options = {}) {
  const effect = function effect(...args) {
    return run(effect, fn, args)
  }

  effect.deps = []
  effect.computed = options.computed
  effect.lazy = options.lazy

  return effect
}

function run(effect, fn, args) {
  if (effectStack.indexOf(effect) === -1) {
    try {
      effectStack.push(effect)

      return fn(...args)
    } finally {
      effectStack.pop()
    }
  }
}

function computed(fn) {
  const runner = effect(fn, { computed: true, lazy: true })

  return {
    effect: runner,
    get value() {
      return runner()
    }
  }
}
