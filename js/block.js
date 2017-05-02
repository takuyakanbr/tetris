
/**
 * A template representing one type of tetris block
 * @constructor
 * @param {number} name used for displaying the cell
 * @param {number} directions number of possible orientations of block
 * @param {Array<Array<number>>} grid block data
 */
function BlockTemplate(name, directions, grid) {
    this.name = name; // cell classname: .grid-cell-[name]
    this.directions = directions;
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
