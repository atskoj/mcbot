const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer

const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalBlock } = require('mineflayer-pathfinder').goals

const inventoryViewer = require('mineflaye-web-inventory');

var radarPlugin = require('mineflayer-radar')(mineflayer);

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4],
  password: process.argv[5]
})

bot.loadPlugin(pathfinder)
inventoryViewer(bot, {port: 3001});
radarPlugin(bot, {port: 3002});

var stdin = process.openStdin();

//live listener
stdin.addListener("data", function(d) {
  reald = d.toString().trim();
  var dargs = reald.split(' ');

  switch(dargs[0])
  {
    default:
      break

    case "say":
      var toSay = dargs.slice(1);
      bot.chat(toSay);
  }
});

bot.on('kicked', console.log)
bot.on('error', console.log)

bot.once('spawn', () => {
  mineflayerViewer(bot, { port: 3000 })

  bot.on('path_update', (r) => {
    const nodesPerTick = (r.visitedNodes * 50 / r.time).toFixed(2)
    console.log(`I can get there in ${r.path.length} moves. Computation took ${r.time.toFixed(2)} ms (${nodesPerTick} nodes/tick). ${r.status}`)
    const path = [bot.entity.position.offset(0, 0.5, 0)]
    for (const node of r.path) {
      path.push({ x: node.x, y: node.y + 0.5, z: node.z })
    }
    bot.viewer.drawLine('path', path, 0xff00ff)
  })

  const mcData = require('minecraft-data')(bot.version)
  const defaultMove = new Movements(bot, mcData)

  bot.viewer.on('blockClicked', (block, face, button) => {
    if (button !== 2) return // only right click

    const p = block.position.offset(0, 1, 0)

    bot.pathfinder.setMovements(defaultMove)
    bot.pathfinder.setGoal(new GoalBlock(p.x, p.y, p.z))
  })
})