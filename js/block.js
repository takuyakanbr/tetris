'use strict';

/**
 * A template representing one type of tetris block
 * @constructor
 * @param {number} name used as part of classname when displaying the block
 * @param {number} forms number of possible forms
 * @param {boolean} starter whether we can start the game with this block
 * @param {Array<Array<number>>} grid block data
 */
function BlockTemplate(name, forms, starter, grid) {
    this.name = name;
    this.forms = forms;
    this.starter = starter;
    
    // generate the lists of cells
    var lists = [];
    for (var form = 0; form < this.forms; form++) {
        var cells = [];

        for (var y = 0; y < grid.length; y++) {
            for (var x = 0; x < grid[0].length; x++) {
                if ((grid[y][x] >> form) & 1)
                    cells.push({ x: x, y: y });
            }
        }

        lists.push(cells);
    }

    this.cellLists = lists;
}

BlockTemplate.prototype.getCells = function (form) {
    return this.cellLists[form];
}


/**
 * A tetris block
 * @constructor
 * @param {Object} template block template
 * @param {number} x x-coordinate of the left-most col
 * @param {number} y y-coordinate of the upper-most row
 * @param {number} form starting form
 */
function Block(template, x, y, form) {
    this.template = template;
    this.x = x;
    this.y = y;
    this.form = form || 0;
    this.grounded = false; // whether we've touched the ground
    this.cells = [] // list of cells the block occupy
    this._updateCells();
}

Block.prototype.getName = function () {
    return this.template.name;
};

Block.prototype.getForms = function () {
    return this.template.forms;
}

Block.prototype.getCells = function () {
    return this.cells;
};

Block.prototype.copy = function () {
    return new Block(this.template, this.x, this.y, this.form);
};

Block.prototype.shift = function (dx, dy) {
    this.x += dx;
    this.y += dy;
    this._updateCells();
};

Block.prototype.transform = function (delta) {
    this.form = (this.form + delta) % this.getForms();
    this._updateCells();
};

// get the list of rows the block occupy,
// in increasing order, and with no repeated rows
Block.prototype.getRows = function () {
    var rows = [];
    var cells = this.cells;
    for (var i = 0; i < cells.length; i++) {
        if (rows.indexOf(cells[i].y) === -1)
            rows.push(cells[i].y);
    }
    return rows;
};

// get the highest cell in each column
Block.prototype.getHighestCells = function () {
    return this.getHighestCellsFromOrigin(this.x, this.y, this.form);
};

// get the highest cell in each column, given the specified top left cell and form
Block.prototype.getHighestCellsFromOrigin = function (ox, oy, form) {
    var cells = [];
    var map = {};

    // the list in the template was created row by row from top to bottom,
    // so here we just take the first cell for each column
    var template = this.template.getCells(form);
    for (var i = 0; i < template.length; i++) {
        var x = template[i].x;
        if (!map[x]) {
            cells.push({ x: x + ox, y: template[i].y + oy });
            map[x] = true;
        }
    }
    return cells;
};

// get the lowest cell in each column
Block.prototype.getLowestCells = function () {
    return this.getLowestCellsFromOrigin(this.x, this.y, this.form);
};

// get the lowest cell in each column, given the specified top left cell and form
Block.prototype.getLowestCellsFromOrigin = function (ox, oy, form) {
    var cells = [];
    var map = {};

    // the list in the template was created row by row from top to bottom,
    // so here we just take the first cell (from the back) for each column
    var template = this.template.getCells(form);
    for (var i = template.length - 1; i >= 0; i++) {
        var x = template[i].x;
        if (!map[x]) {
            cells.push({ x: x + ox, y: template[i].y + oy });
            map[x] = true;
        }
    }
    return cells;
};

// get the list of cells the block occupy, given the specified offset
Block.prototype.getCellsWithOffset = function (dx, dy) {
    return this.getCellsFromOrigin(this.x + dx, this.y + dy);
};

// get the list of cells the block occupy, given the specified transformation
Block.prototype.getTransformedCells = function (delta) {
    return this.getCellsFromOrigin(this.x, this.y, this.form + delta);
};

// get the list of cells the block occupy, given the specified top left cell and form
Block.prototype.getCellsFromOrigin = function (ox, oy, form) {
    if (form === undefined) form = this.form;
    form %= this.getForms();

    var cells = [];
    var template = this.template.getCells(form);
    for (var i = 0; i < template.length; i++) {
        cells.push({ x: template[i].x + ox, y: template[i].y + oy });
    }
    
    return cells;
};

Block.prototype._updateCells = function () {
    this.cells = this.getCellsFromOrigin(this.x, this.y);
};


/**
 * Provides a randomly shuffled source of Blocks
 * @constructor
 * @param {number} spawnX x-coordinate of spawn point of blocks generated
 * @param {number} spawnY y-coordinate of spawn point
 */
function BlockGenerator(spawnX, spawnY) {
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.templates = [];
    this.maxBlockSize = 0;

    this.queue = [];
    this.count = 0;
}

BlockGenerator.prototype.addTemplate = function (name, forms, starter, grid) {
    if (grid.length > this.maxBlockSize)
        this.maxBlockSize = grid.length;
    this.templates.push(new BlockTemplate(name, forms, starter, grid));
};

BlockGenerator.prototype.getMaxSize = function () {
    return this.maxBlockSize;
};

BlockGenerator.prototype.getTemplateCount = function () {
    return this.templates.length;
};

BlockGenerator.prototype.getBlockById = function (id) {
    return new Block(this.templates[id], this.spawnX, this.spawnY);
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
    if (this.count == 0) {
        // first block must be marked as starter
        while (!queue[queue.length - 1].starter)
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
