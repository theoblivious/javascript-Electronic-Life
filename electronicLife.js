// creating a grid of what our world would look like. 'o' represents the person in our world.
// the '#' represents rocks and impassible objects.
var plan = ["############################",
    "#      #    #      o      ##",
    "#                          #",
    "#          #####           #",
    "##         #   #    ##     #",
    "###           ##     #     #",
    "#           ###      #     #",
    "#   ####                   #",
    "#   ##       o             #",
    "# o  #         o       ### #",
    "#    #                     #",
    "############################"
];

function Vector(x, y) {
    this.x = x;
    this.y = y;
}
Vector.prototype.plus = function(other) {
    return new Vector(this.x + other.x, this.y + other.y);
};


//This code defines the Grid object, with some basic methods:
function Grid(width, height) {
    this.space = new Array(width * height);
    this.width = width;
    this.height = height;
}
Grid.prototype.isInside = function(vector) {
    return vector.x >= 0 && vector.x < this.width &&
        vector.y >= 0 && vector.y < this.height;
};
Grid.prototype.get = function(vector) {
    return this.space[vector.x + this.width * vector.y];
};
Grid.prototype.set = function(vector, value) {
    this.space[vector.x + this.width * vector.y] = value;
};

//giving directions by using the vector object
var directions = {
    "n": new Vector(0, -1),
    "ne": new Vector(1, -1),
    "e": new Vector(1, 0),
    "se": new Vector(1, 1),
    "s": new Vector(0, 1),
    "sw": new Vector(-1, 1),
    "w": new Vector(-1, 0),
    "nw": new Vector(-1, -1)
};

// simple stupid critter that  bounces around until it hits an obstacle and bounces into a random direction
//random element array picks a random elemnt from an array. the critter picks a random direction by calling this.
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

var directionNames = "n ne e se s sw w nw".split(" ");

function BouncingCritter() {
    this.direction = randomElement(directionNames);
}

BouncingCritter.prototype.act = function(view) {
    if (view.look(this.direction) != " ")
        this.direction = view.find(" ") || "s";
    return {
        type: "move",
        direction: this.direction
    };
};

//world object

function elementFromChar(legend, ch) {
    if (ch == " ")
        return null;
    var element = new legend[ch]();
    element.originChar = ch;
    return element;
}

function World(map, legend) {
    var grid = new Grid(map[0].length, map.length);
    this.grid = grid;
    this.legend = legend;

    map.forEach(function(line, y) {
        for (var x = 0; x < line.length; x++)
            grid.set(new Vector(x, y),
                elementFromChar(legend, line[x]));
    });
}

function charFromElement(element) {
    if (element === null)
        return " ";
    else
        return element.originChar;
}

World.prototype.toString = function() {
    var output = "";
    for (var y = 0; y < this.grid.height; y++) {
        for (var x = 0; x < this.grid.width; x++) {
            var element = this.grid.get(new Vector(x, y));
            output += charFromElement(element);
        }
        output += "\n";
    }
    return output;
};

function Wall() {}


var world = new World(plan, {
    "#": Wall,
    "o": BouncingCritter
});
console.log(world.toString());
// → ############################
//   #      #    #      o      ##
//   #                          #
//   #          #####           #
//   ##         #   #    ##     #
//   ###           ##     #     #
//   #           ###      #     #
//   #   ####                   #
//   #   ##       o             #
//   # o  #         o       ### #
//   #    #                     #
//   ############################

Grid.prototype.forEach = function(f, context) {
    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
            var value = this.space[x + y * this.width];
            if (value !== null)
                f.call(context, value, new Vector(x, y));
        }
    }
};

//animating life: writing  a turn method to give the critters life and movement

World.prototype.turn = function() {
    var acted = [];
    this.grid.forEach(function(critter, vector) {
        if (critter.act && acted.indexOf(critter) == -1) {
            acted.push(critter);
            this.letAct(critter, vector);
        }
    }, this);
};

World.prototype.letAct = function(critter, vector) {
    var action = critter.act(new View(this, vector));
    if (action && action.type == "move") {
        var dest = this.checkDestination(action, vector);
        if (dest && this.grid.get(dest) === null) {
            this.grid.set(vector, null);
            this.grid.set(dest, critter);
        }
    }
};

World.prototype.checkDestination = function(action, vector) {
    if (directions.hasOwnProperty(action.direction)) {
        var dest = vector.plus(directions[action.direction]);
        if (this.grid.isInside(dest))
            return dest;
    }
};

function View(world, vector) {
    this.world = world;
    this.vector = vector;
}
View.prototype.look = function(dir) {
    var target = this.vector.plus(directions[dir]);
    if (this.world.grid.isInside(target))
        return charFromElement(this.world.grid.get(target));
    else
        return "#";
};
View.prototype.findAll = function(ch) {
    var found = [];
    for (var dir in directions)
        if (this.look(dir) == ch)
            found.push(dir);
    return found;
};
View.prototype.find = function(ch) {
    var found = this.findAll(ch);
    if (found.length === 0) return null;
    return randomElement(found);
};

//making things move here:

function dirPlus(dir, n) {
    var index = directionNames.indexOf(dir);
    return directionNames[(index + n + 8) % 8];
}

function WallFollower() {
    this.dir = "s";
}

WallFollower.prototype.act = function(view) {
    var start = this.dir;
    if (view.look(dirPlus(this.dir, -3)) != " ")
        start = this.dir = dirPlus(this.dir, -2);
    while (view.look(this.dir) != " ") {
        this.dir = dirPlus(this.dir, 1);
        if (this.dir == start) break;
    }
    return {
        type: "move",
        direction: this.dir
    };
};

//adding concepts of food

function LifelikeWorld(map, legend) {
    World.call(this, map, legend);
}
LifelikeWorld.prototype = Object.create(World.prototype);

var actionTypes = Object.create(null);

LifelikeWorld.prototype.letAct = function(critter, vector) {
    var action = critter.act(new View(this, vector));
    var handled = action &&
        action.type in actionTypes &&
        actionTypes[action.type].call(this, critter,
            vector, action);
    if (!handled) {
        critter.energy -= 0.2;
        if (critter.energy <= 0)
            this.grid.set(vector, null);
    }
};

//make a critter grow

actionTypes.grow = function(critter) {
    critter.energy += 0.5;
    return true;
};

//moving
actionTypes.move = function(critter, vector, action) {
    var dest = this.checkDestination(action, vector);
    if (dest === null ||
        critter.energy <= 1 ||
        this.grid.get(dest) !== null)
        return false;
    critter.energy -= 1;
    this.grid.set(vector, null);
    this.grid.set(dest, critter);
    return true;
};

//making critters eat

actionTypes.eat = function(critter, vector, action) {
    var dest = this.checkDestination(action, vector);
    var atDest = dest !== null && this.grid.get(dest);
    if (!atDest || atDest.energy === null)
        return false;
    critter.energy += atDest.energy;
    this.grid.set(dest, null);
    return true;
};

//reproducing

actionTypes.reproduce = function(critter, vector, action) {
    var baby = elementFromChar(this.legend,
        critter.originChar);
    var dest = this.checkDestination(action, vector);
    if (dest === null ||
        critter.energy <= 2 * baby.energy ||
        this.grid.get(dest) !== null)
        return false;
    critter.energy -= 2 * baby.energy;
    this.grid.set(dest, baby);
    return true;
};

//adding plants: plants have an energy level of 3 and 7

function Plant() {
    this.energy = 3 + Math.random() * 4;
}
Plant.prototype.act = function(context) {
    if (this.energy > 15) {
        var space = context.find(" ");
        if (space)
            return {
                type: "reproduce",
                direction: space
            };
    }
    if (this.energy < 20)
        return {
            type: "grow"
        };
};

//defining a plant eater

function PlantEater() {
    this.energy = 20;
}
PlantEater.prototype.act = function(context) {
    var space = context.find(" ");
    if (this.energy > 60 && space)
        return {
            type: "reproduce",
            direction: space
        };
    var plant = context.find("*");
    if (plant)
        return {
            type: "eat",
            direction: plant
        };
    if (space)
        return {
            type: "move",
            direction: space
        };
};

//animating the world with a valley map

var valley = new LifelikeWorld(
    ["############################",
        "#####                 ######",
        "##   ***                **##",
        "#   *##**         **  O  *##",
        "#    ***     O    ##**    *#",
        "#       O         ##***    #",
        "#                 ##**     #",
        "#   O       #*             #",
        "#*          #**       O    #",
        "#***        ##**    O    **#",
        "##****     ###***       *###",
        "############################"
    ], {
        "#": Wall,
        "O": PlantEater,
        "*": Plant
    }
);



////// artificial stupidity


function SmartPlantEater() {
    this.energy = 40;
}
SmartPlantEater.prototype.act = function(context) {
    var space = context.find(" ");
    if (this.energy > 60 && space)
        return {
            type: "reproduce",
            direction: space
        };
    var plant = context.find("*");
    if (plant)
        return {
            type: "eat",
            direction: plant
        };
    if (space)
        return {
            type: "move",
            direction: space
        };
};
function SmartPlantEater() {}

animateWorld(new LifelikeWorld(
  ["############################",
   "#####                 ######",
   "##   ***                **##",
   "#   *##**         **  O  *##",
   "#    ***     O    ##**    *#",
   "#       O         ##***    #",
   "#                 ##**     #",
   "#   O       #*             #",
   "#*          #**       O    #",
   "#***        ##**    O    **#",
   "##****     ###***       *###",
   "############################"],
  {"#": Wall,
   "O": SmartPlantEater,
   "*": Plant}
));



///////tiger
function Tiger() {
    this.energy = 400;
}
Tiger.prototype.act = function(context) {
    var space = context.find(" ");
    if (this.energy > 20 && space)
        return {
            type: "reproduce",
            direction: space
        };
    var smartplanteater = context.find("O");
    if (smartplanteater)
        return {
            type: "eat",
            direction: smartplanteater
        };
    if (space)
        return {
            type: "move",
            direction: space
        };
};
function Tiger() {}

animateWorld(new LifelikeWorld(
  ["####################################################",
   "#                 ####         ****              ###",
   "#   *  @  ##                 ########       OO    ##",
   "#   *    ##        O O                 ****       *#",
   "#       ##*                        ##########     *#",
   "#      ##***  *         ****                     **#",
   "#* **  #  *  ***      #########                  **#",
   "#* **  #      *               #   *              **#",
   "#     ##              #   O   #  ***          ######",
   "#*            @       #       #   *        O  #    #",
   "#*                    #  ######                 ** #",
   "###          ****          ***                  ** #",
   "#       O                        @         O       #",
   "#   *     ##  ##  ##  ##               ###      *  #",
   "#   **         #              *       #####  O     #",
   "##  **  O   O  #  #    ***  ***        ###      ** #",
   "###               #   *****                    ****#",
   "####################################################"],
  {"#": Wall,
   "@": Tiger,
   "O": SmartPlantEater, // from previous exercise
   "*": Plant}
));

