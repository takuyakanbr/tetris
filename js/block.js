'use strict';

/**
 * A template representing one type of tetris block
 * @constructor
 * @param {number} name used for displaying the cell
 * @param {number} directions number of possible orientations of block
 * @param {boolean} limited
 * @param {Array<Array<number>>} grid block data
 */
function BlockTemplate(name, directions, limited, grid) {
    this.name = name; // cell classname: .grid-cell-[name]
    this.directions = directions;
    this.limited = limited; // don't start the game with this block
    // position of the block for 1st direction: right-most bit of each element,
    // 2nd direction: 2nd right-most bit, and so on
    this.grid = grid;
}


/**
 * A tetris block
 * @constructor
 * @param {Object} tp block template
 * @param {number} x x-coordinate of the 1st col
 * @param {number} y y-coordinate of the 1st row
 */
function Block(tp, x, y) {
    this.tp = tp;
    this.x = x; // top left corner of area containing the block
    this.y = y;
    this.dir = 0; // which way the block is facing
    this.grounded = false; // whether we've touched the ground
}

Block.prototype.getName = function () {
    return this.tp.name;
};

Block.prototype.copy = function () {
    var block = new Block(this.tp, this.x, this.y);
    block.dir = this.dir;
    return block;
};

Block.prototype.shift = function (dx, dy) {
    this.x += dx;
    this.y += dy;
};

Block.prototype.rotate = function (rotation) {
    this.dir = (this.dir + rotation) % this.tp.directions;
};

// get the list of cells the block occupy
Block.prototype.getCells = function () {
    return this.getCellsFromOrigin(this.x, this.y);
};

// get the list of cells the block occupy, given the specified top left cell and direction
Block.prototype.getCellsFromOrigin = function (ox, oy, dir) {
    ox = ox || 0;
    oy = oy || 0;
    if (dir === undefined) dir = this.dir;
    dir %= this.tp.directions;
    var cells = [];
    var grid = this.tp.grid;
    for (var y = 0; y < grid.length; y++) {
        for (var x = 0; x < grid[0].length; x++) {
            if ((grid[y][x] >> dir) & 1)
                cells.push({ x: x + ox, y: y + oy });
        }
    }
    return cells;
};

// get the list of cells the block occupy, given the specified offset
Block.prototype.getCellsWithOffset = function (dx, dy) {
    return this.getCellsFromOrigin(this.x + dx, this.y + dy);
};

// get the list of cells the block occupy, given the specified rotation
Block.prototype.getCellsWithRotation = function (rotation) {
    return this.getCellsFromOrigin(this.x, this.y, this.dir + rotation);
};

// get the list of rows the block occupy,
// in increasing order, and with no repeated rows
Block.prototype.getRows = function () {
    var rows = [];
    var grid = this.tp.grid;
    for (var y = 0; y < grid.length; y++) {
        for (var x = 0; x < grid[0].length; x++) {
            if ((grid[y][x] >> this.dir) & 1) {
                rows.push(y + this.y);
                break;
            }
        }
    }
    return rows;
};


/**
 * Provides a randomly shuffled source of Blocks
 * @constructor
 * @param {number} spawnX x-coordinate of block spawn point
 * @param {number} spawnY y-coordinate of block spawn point
 */
function BlockGenerator(spawnX, spawnY) {
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.templates = [];
    this.largestBlock = 0;

    this.queue = [];
    this.count = 0;
}

BlockGenerator.prototype.addTemplate = function (name, directions, limited, grid) {
    if (grid.length > this.largestBlock)
        this.largestBlock = grid.length;
    this.templates.push(new BlockTemplate(name, directions, limited, grid));
};

BlockGenerator.prototype.getMaxSize = function () {
    return this.largestBlock;
};

BlockGenerator.prototype.next = function () {
    if (this.queue.length == 0)
        this._populateQueue();
    this.count++;
    return new Block(this.queue.pop(), this.spawnX, this.spawnY);
};

BlockGenerator.prototype.reset = function () {
    this.count = 0;
    this._populateQueue();
};

BlockGenerator.prototype._populateQueue = function () {
    var queue = this.templates.concat(this.templates);
    this._shuffle(queue);
    if (this.count == 0) { // don't start with a BlockTemplate marked limited
        while (queue[queue.length - 1].limited)
            this._shuffle(queue);
    }
    this.queue = queue;
};

// in-place array shuffling
BlockGenerator.prototype._shuffle = function (array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};
