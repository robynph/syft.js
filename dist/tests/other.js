"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function arrMul(arr, n) {
    let res = [];
    for (let i = 0; i < n; i++) {
        res = res.concat(arr);
    }
    return res;
}
const syft = require("..");
let g = global;
g.syft = syft;
async function test() {
    let training = {
        input: await syft.Tensor.FloatTensor.create(arrMul([[0, 0, 1], [0, 1.0, 1], [1, 0, 1], [1, 1, 1]], 2000)),
        output: await syft.Tensor.FloatTensor.create(arrMul([[0, 0], [0, 0], [0, 1], [0, 1]], 2000)),
    };
    let model = await syft.Model.Sequential.create([
        await syft.Model.Linear.create(3, 4),
        await syft.Model.Tanh.create(),
        await syft.Model.Linear.create(4, 2),
        await syft.Model.Softmax.create(1),
        await syft.Model.Log.create()
    ]);
    g.model = model;
    let loss = await syft.Model.NLLLoss.create();
    let optim = await syft.Optimizer.SGD.create(await model.parameters());
    let metric = ['accuracy'];
    let train = async () => {
        let error = await model.fit(training.input, training.output, loss, optim, 100, 10, 1, metric, true);
        console.log('trained!', error);
    };
    await train();
    g.train = train;
    g.perd = await model.forward(training.input);
    console.log(await global.perd.toString());
}
test();
//# sourceMappingURL=other.js.map