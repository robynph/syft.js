import * as uuid from 'uuid'
import * as zmq from 'zmq'

import {
  Tensor,
  FloatTensor,
  IntTensor,
  Model
} from './syft'

import {
  assertType,
  WorkQueue,
  AsyncInstance
} from './lib'

export const verbose = !!process.argv[2]

const identity = uuid.v4()
const socket = zmq.socket('dealer')

socket.identity = identity
socket.connect('tcp://localhost:5555')

export function log(
  ...args: any[]
): void {
  if (verbose) {
    console.log(...args)
  }
}

// Network Convenience Functions
export function cmd(
  options: {
    [key: string]: any
    functionCall: string
    tensorIndexParams?: any[],
  }
): SocketCMD {
  return {
    objectType: 'controller',
    objectIndex: '-1',
    tensorIndexParams: [],
    ...options
  }
}

const wq = new WorkQueue<string, string>(job => {
  // send the command
  log('sending:', job.data)
  socket.send(/*job.id + */job.data)
}, 1)

socket.on('message', (res) => {

  // TODO: allow for mutiple request at once
  // let str = res.toString()
  // let id = str.slice(0, wq.idLength)
  // let result = str.slice(wq.idLength)

  let job
  for (let id in wq.working) {
    job = wq.working[id]
  }

  if (job) {
    let r = res.toString()

    log('receiving:', r)

    if (r.startsWith('Unity Error:')) {
      job.reject(new Error(r))
    } else {
      job.resolve(r)
    }
  }
})

// Introspection
export async function num_models() {
  return assertType(
    await sendJSON(cmd({
      functionCall: 'num_models'
    }), 'int'),
    'number'
  )
}

export async function load(
  filename: string
) {
  return assertType(
    await sendJSON(cmd({
      functionCall: 'load_floattensor',
      tensorIndexParams: [filename]
    }), 'FloatTensor'),
    FloatTensor
  )

}

export async function save(
  x: Tensor,
  filename: string
) {
  return x.save(filename)
}

export async function concatenate(
  tensors: Tensor[],
  axis = 0
) {

  let ids = tensors.map(t => t.id)

  return assertType(
    await sendJSON(cmd({
      functionCall: 'concatenate',
      tensorIndexParams: [axis, ...ids]
    }), 'FloatTensor'),
    FloatTensor
  )
}

export async function num_tensors() {
  return assertType(
    await sendJSON(cmd({
      functionCall: 'num_tensors'
    }), 'int'),
    'number'
  ) as number
}

export async function new_tensors_allowed(
  allowed?: boolean
) {
    if (allowed == null) {
      return assertType(
        await sendJSON(cmd({
          functionCall:'new_tensors_allowed'
        }), 'bool'),
        'boolean'
      ) as boolean
    } else if (allowed) {
      return assertType(
        await sendJSON(cmd({
          functionCall:'new_tensors_allowed',
          tensorIndexParams: ['True']
        }), 'bool'),
        'boolean'
      ) as boolean
    } else {
      return assertType(
        await sendJSON(cmd({
          functionCall:'new_tensors_allowed',
          tensorIndexParams: ['False']
        }), 'bool'),
        'boolean'
      ) as boolean
    }
}

export async function sendJSON(
  message: SocketCMD,
  return_type?: string
) {
  let data = JSON.stringify(message)

  // send the command
  let res = await wq.queue(data)

  if (return_type == null) {
    return
  } else if (return_type === 'FloatTensor') {
      if (res !== '-1' && res !== '') {
        return new FloatTensor(AsyncInstance, res)
      }
      return
  } else if (return_type === 'IntTensor') {
    if (res !== '-1' && res !== '') {
      return new IntTensor(AsyncInstance, res)
    }
    return
  } else if (return_type === 'FloatTensor_list') {
    let tensors: Tensor[] = []

    if (res !== '') {
      let ids = res.split(',')
      for (let str_id of ids) {
        if (str_id) {
          tensors.push(new FloatTensor(AsyncInstance, str_id))
        }
      }
    }

    return tensors
  } else if (return_type === 'Model_list') {
    let models: Model[] = []

    if (res !== '') {
      let ids = res.split(',')
      for (let str_id of ids) {
        if (str_id) {
          models.push(await Model.getModel(str_id))
        }
      }
    }

    return models
  } else if (return_type === 'int' || return_type === 'float') {
    return Number(res)
  } else if (return_type === 'string') {
    return String(res)
  } else if (return_type === 'bool') {
    if (res === 'True') {
      return true
    } else if (res === 'False') {
      return false
    }
  }

  return res
}
