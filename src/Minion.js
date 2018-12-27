const WebSocket = require('ws')

module.exports = class Minion {
  constructor (url) {
    this._url = url

    this._internalEvents = new EventEmitter()
    this._nextRequestId = 0
    this._isStarting = false
    this._isClosed = false

    this.promiseToStart = new PromiseToEmit(this._internalEvents, 'ready')
    this.promiseToClose = new PromiseToEmit(this._internalEvents, 'close')
  }

  start() {
    if (this._isStarting) return
    if (this._isClosed) return
    this._isStarting = true
    console.warn('Starting Minion...')
    new Process(async (process)=>{
      while (process.active) {
        this._ws = new WebSocket(`ws://${url}/stream`);
        await new PromiseToEmit(this._ws, 'open')
        this._ws.on('message', this._handleMessage.bind(this))
        console.warn('... Minion is ready ...')
        this._internalEvents.emit('ready')
        await new PromiseToEmit(this._ws, 'close')
        this.promiseToStart = new PromiseToEmit(this._internalEvents, 'ready')
      }
    })
  }

  _handleMessage(str) {
    const message = JSONparseSafe(str, {})
    const {requestId, responseId, payload} = message
    this._internalEvents.emit(`response:${requestId}`, {responseId, payload})
  }

  close() {
    if (this._isClosed) return
    await this.promiseToStart

    this._isClosed = true
    this._internalEvents.emit('close')
    this._ws.close()
  }

  // Events
  triggerEvent(eventName, value) {
    return this._send('triggerEvent', eventName, value)
  }

  hookEvent(eventName, callback, context) {
    return this._subscribe('hookEvent', eventName, callback, context)
  }

  // Tasks
  feedTask(taskName, payload) {
    return this._send('feedTask', taskName, {payload})
  }

  requestTask(taskName, payload, responseHandler, context) {
    return this._fetch('requestTask', taskName, {payload}, responseHandler, context)
  }

  consumeTask(taskName, taskHandler, context) {
    return this._request('consumeTask', taskName, taskHandler, context)
  }

  subscribeTask(taskName, subscriptionHandler, context) {
    return this._subscribe('subscribeTask', taskName, subscriptionHandler, context)
  }

  _send(methodName, methodCatagory, data) {
    return this._fetch(methodName, methodCatagory, data)
  }

  _fetch(methodName, methodCatagory, data, fetchHandler, fetchContext) {
    return new Process(async (process) => {
      await this.promiseToStart

      if (process.closed) return
      const requestId = this._nextRequestId ++
      this._ws.send(JSON.stringify({}, data, { requestId, methodName, methodCatagory}))
      
      if (process.closed) return
      if (!fetchHandler) return process.close()
      let response = await new PromiseToEmit(this._internalEvents, `response:${requestId}`)

      if (process.closed) return
      fetchHandler.call(fetchContext, response)
      process.close()
    }, this._internalEvents)
  }

  async _request(methodName, methodCatagory, requestHandler, context) {
    return new Process(async (process) => {
      this._fetch(methodName, methodCatagory, ({responseId, payload})=>{
        payload = await requestHandler.call(context, payload)
        this._send('respond', '', {responseId, payload})
      })
    }, this._internalEvents)
  }

  async _subscribe(methodName, methodCatagory, subscriptionHandler, subscriptionContext) {
    return new Process(async (process) => {
      await this.promiseToStart
      if (process.closed) return
      
      const requestId = this._nextRequestId ++
      this._ws.send(JSON.stringify({}, data, { requestId, methodName, methodCatagory}))
      
      if (process.closed) return
      if (!fetchHandler) return process.close()
      this._internalEvents.on(`response:${requestId}`, subscriptionHandler, subscriptionContext)

      await new PromiseToEmit(process, `close`)
      this._internalEvents.off(`response:${requestId}`, subscriptionHandler, subscriptionContext)
      process.close()
    }, this._internalEvents)
  }
}
