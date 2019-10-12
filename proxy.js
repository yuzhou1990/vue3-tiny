let obj = { name: 'chiu', location: { city: 'beijing' } }
// let obj = [1, 2, 3]
let o = new Proxy(obj, {
  get(target, key) {
    console.log('get', key)
    return Reflect.get(target, key)
  },
  set(target, key, val) {
    console.log('set', key, val)
    return Reflect.set(target, key, val)
  }
})

// o.name = 'vue3'
// console.log(o.name)

// 数组多次触发
// o.push(8)
// o.unshift(4)

// 对象嵌套
// o.location.city = 'dalian'
