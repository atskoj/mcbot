const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer
const collectBlock = require('mineflayer-collectblock').plugin
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalNear, GoalBlock, GoalXZ, GoalY, GoalInvert, GoalFollow } = require('mineflayer-pathfinder').goals
var scaffoldPlugin = require('mineflayer-scaffold')(mineflayer);
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
const vec3 = require('vec3')

const inventoryViewer = require('mineflayer-web-inventory');

/*const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4],
  password: process.argv[5]
})
*/

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: 25565,
  username: process.argv[3],
  password: process.argv[4],
  version: "1.8.9"
})


//loading block finder plugin
bot.loadPlugin(collectBlock);
bot.loadPlugin(pathfinder);
bot.loadPlugin(scaffoldPlugin);
bot.loadPlugin(navigatePlugin);

inventoryViewer(bot, {port: 3001});

var stdin = process.openStdin();

//live listener
stdin.addListener("data", function(d) {
  reald = d.toString().trim();
  var dargs = reald.split(' ');


//func
function build () {
  const referenceBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0))
  const jumpY = Math.floor(bot.entity.position.y) + 1.0
  bot.setControlState('jump', true)
  bot.on('move', placeIfHighEnough)


  function placeIfHighEnough () {
    if (bot.entity.position.y > jumpY) {
      bot.placeBlock(referenceBlock, vec3(0, 1, 0), (err) => {
          console.log(err.message);
          return;
        })
      bot.setControlState('jump', false)
      bot.removeListener('move', placeIfHighEnough)
    }
  }
}

  switch(dargs[0])
  {
    default:
      break;

    case "help":
      console.log("commands are:\n say (message) \n path (x,z) \n msg (user) (message)");
      break;

    case "say":
      var toSay = dargs.slice(1).toString();
      bot.chat(toSay.replace(/,/g , " "));
      break;

    case "path":
      var mcData = require('minecraft-data')(bot.version);
      var defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.goto(new GoalXZ(dargs[1],dargs[2]));
      break;

    case "pathY":
      var mcData = require('minecraft-data')(bot.version);
      var defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.goto(new GoalBlock(dargs[1], dargs[2], dargs[3]));
      break;

    case "msg":
      var toSay = dargs.slice(2).toString();
      bot.whisper(dargs[1], toSay.replace(/,/g , " "));
      break;

    case "coords":
      console.log(bot.entity.position);
      break;
    
    //collect block
    case "collect":
      var mcData = require('minecraft-data')(bot.version);
      for (let i = 0; i < dargs[2]; i++) {
        var blockType = mcData.blocksByName[dargs[1]];
        if (!blockType) {
          console.log("I don't know any blocks with that name.")
          return
        }

        console.log('Collecting the nearest ' + blockType.name)
        // Try and find that block type in the world
        const block = bot.findBlock({
          matching: blockType.id,
          maxDistance: 64
        })

        if (!block) {
          console.log("I don't see that block nearby.");
          return
        }

        bot.collectBlock.collect(block, err=> {
          if (err) console.log(err.message)
        })
      }
      break;
        
    case "craft":
        const name = dargs[1];
        const amount = dargs[2];
        var mcData = require('minecraft-data')(bot.version);
        const item = mcData.findItemOrBlockByName(name);
        const craftingTableID = mcData.blocksByName.crafting_table.id;
              
        const craftingTable = bot.findBlock({
            matching: craftingTableID
        })
              
        if (item) {
            const recipe = bot.recipesFor(item.id, null, 1, craftingTable)[0]
            if (recipe) {
              console.log(`I can make ${name}`)
            try {
                bot.craft(recipe, amount, craftingTable)
                console.log(`did the recipe for ${name}`)
            } catch (err) {
              console.log(`error making ${name}`)
            }
            } else {
              console.log(`I cannot make ${name}`)
            }
        } else {
          console.log(`unknown item: ${name}`)
      }
      break;
    
    case "table":
      var mcData = require('minecraft-data')(bot.version);
      bot.equip(mcData.itemsByName.crafting_table.id, 'hand');
      bot.placeBlock()
      build();
      break;

  }
});

bot.on('kicked', console.log)
bot.on('error', console.log)

bot.on('message', (message) => {
  console.log(message.toAnsi())
});


// Load mc data
let mcData;
mcData = require('minecraft-data')(bot.version);

bot.once('spawn', () => {
  mineflayerViewer(bot, { firstPerson: false, port: 3000 });
  mineflayerViewer(bot, { port: 3002, firstPerson: true });
  bot.viewer.version = "1.8.9";
  bot.viewer.firstPerson = true;

  //load mcData
  mcData = require('minecraft-data')(bot.version);

  bot.on('path_update', (r) => {
    const nodesPerTick = (r.visitedNodes * 50 / r.time).toFixed(2)
    console.log(`I can get there in ${r.path.length} moves. Computation took ${r.time.toFixed(2)} ms (${nodesPerTick} nodes/tick). ${r.status}`)
    const path = [bot.entity.position.offset(0, 0.5, 0)]
    for (const node of r.path) {
      path.push({ x: node.x, y: node.y + 0.5, z: node.z })
    }
    bot.viewer.drawLine('path', path, 0xff00ff)
  })


  bot.viewer.on('blockClicked', (block, face, button) => {
    if (button !== 2) return // only right click
    var mcData = require('minecraft-data')(bot.version);
    var defaultMove = new Movements(bot, mcData);
    const p = block.position.offset(0, 1, 0)

    bot.pathfinder.setMovements(defaultMove)
    bot.pathfinder.setGoal(new GoalBlock(p.x, p.y, p.z))
  })
})

