
let mnist = require('mnist')(false)

import * as syft from '..'
let g = global as any
g.syft = syft
let dataset = mnist(5, 5)


console.log(dataset)

async function test() {
  let training = {
    input: await syft.Tensor.FloatTensor.create(dataset.training.input),
    output: await syft.Tensor.FloatTensor.create(dataset.training.output),
  }
  let testing = {
    input: await syft.Tensor.FloatTensor.create(dataset.test.input),
    output: await syft.Tensor.FloatTensor.create(dataset.test.output),
  }
  g.training = training
  g.testing = testing

  console.log('training.input', training.input.id, await training.input.shape())
  console.log('training.output', training.output.id, await training.output.shape())
  console.log('testing.input', testing.input.id, await testing.input.shape())
  console.log('testing.output', testing.output.id, await testing.output.shape())

  let model = new syft.keras.Sequential()
  g.model = model

  await model.add(new syft.keras.Dense('linear', 10, 784))

  await model.compile(
    'categorical_crossentropy',
    new syft.keras.SGD(0.01),
    ['accuracy']
  )

  g.perd = await model.predict(testing.input)

  console.log(await g.perd.toString())

  let train = async () => {
    let error = await model.fit(
      training.input,
      training.output,
      1,
      1,
      undefined,
      1,
      false,
    )
    console.log('trained!', error)
  }

  await train()

  g.train = train

  // g.perd = await model.predict(testing.input)

  console.log(await (global as any).perd.toString())

}
let done = (res: any) => console.log(res)
test().then(done).catch(done)
