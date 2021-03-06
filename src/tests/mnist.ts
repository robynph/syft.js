import * as syft from '..'

let mnist = require('mnist')(false)

let g = global as any
let dataset = mnist(60000, 10000)

g.syft = syft

async function test() {
  let training = {
    input: await syft.Tensor.FloatTensor.create(dataset.training.input),
    output: await syft.Tensor.FloatTensor.create(dataset.training.output)
  }
  let testing = {
    input: await syft.Tensor.FloatTensor.create(dataset.test.input),
    output: await syft.Tensor.FloatTensor.create(dataset.test.output)
  }

  let model = await syft.Model.Sequential.create([
    await syft.Model.Linear.create(784, 10)
  ])

  g.model = model

  let criterion = await syft.Model.CrossEntropyLoss.create()
  let optim = await syft.Optimizer.SGD.create(await model.parameters(), 0.06)
  let metric = ['accuracy']

  let loss = await model.fit(
    training.input,
    training.output,
    criterion,
    optim,
    32,
    4,
    1,
    metric,
    true
  )

  console.log('trained!', loss)

  g.perd = await model.forward(testing.input)
  criterion.forward(g.perd, testing.output)

  console.log(await g.perd.shape())
}

let done = (res: any) => console.log(res)
test().then(done).catch(done)
