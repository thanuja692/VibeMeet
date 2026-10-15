import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { socketConnection } from '../controllers/socketManager.js'

const requireFrontend = createRequire(new URL('../../frontend/package.json', import.meta.url))
const { io: connect } = requireFrontend('socket.io-client')

function event(socket, name) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out: ${name}`)), 2000)
    socket.once(name, (...args) => {
      clearTimeout(timeout)
      resolve(args)
    })
  })
}

for (const stateEvent of ['video-state', 'mute-state']) {
test(stateEvent + ' reaches peers and late joiners, but not other rooms', async () => {
  const server = createServer()
  const io = socketConnection(server)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  const clients = []
  const client = async () => {
    const socket = connect(url, { transports: ['websocket'], forceNew: true })
    clients.push(socket)
    await event(socket, 'connect')
    return socket
  }
  try {
    const host = await client()
    const outsider = await client()
    let ready = event(host, 'room-created')
    host.emit('create-room', 'camera-test')
    await ready
    ready = event(outsider, 'room-created')
    outsider.emit('create-room', 'other-test')
    await ready
    const unrelatedEvents = []
    outsider.on(stateEvent, (...args) => unrelatedEvents.push(args))
    host.emit(stateEvent, true)
    // Same-socket event ordering ensures the server processed camera-off first.
    ready = event(host, 'signal')
    host.emit('signal', host.id, { type: 'test-barrier' })
    await ready

    const guest = await client()
    let state = event(guest, stateEvent)
    guest.emit('join-call', 'camera-test')
    assert.deepEqual(await state, [host.id, true])

    state = event(guest, stateEvent)
    host.emit(stateEvent, false)
    assert.deepEqual(await state, [host.id, false])

    state = event(host, stateEvent)
    guest.emit(stateEvent, true)
    assert.deepEqual(await state, [guest.id, true])
    assert.deepEqual(unrelatedEvents, [])
  } finally {
    clients.forEach(socket => socket.disconnect())
    await new Promise(resolve => io.close(resolve))
  }
})

}

