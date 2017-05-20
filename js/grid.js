'use strict';

/**
 * A cell (that's part of a grid)
 * @constructor
 * @param {number} x x-coordinate of cell
 * @param {number} y y-coordinate of cell
 */
function Cell(x, y) {
    this.x = x;
    this.y = y;
    this.tile = null;
    this.temp = null; // temp tile
    this.shadow = null; // shadow tile

    this.$e = document.createElement('div');
    this.$e.className = 'grid-cell';
}

Cell.prototype.appendTo = function ($parentNode) {
    $parentNode.appendChild(this.$e);
    return this;
};

Cell.prototype.isEmpty = function () {
    return this.tile === null;
};

Cell.prototype.clear = function () {
    this.tile = null;
    this.temp = null;
    this.shadow = null;
    this.$e.className = 'grid-cell';
}


Cell.prototype.hasTile = function () {
    return this.tile !== null;
};

Cell.prototype.setTile = function (tile) {
    if (this.tile && this.tile != this.temp) this._removeStyle(this.tile);
    if (tile && tile != this.temp) this._addStyle(tile);
    this.tile = tile;
}

Cell.prototype.setTemp = function (temp) {
    if (this.temp && this.temp != this.tile) this._removeStyle(this.temp);
    if (temp && temp != this.tile) this._addStyle(temp);
    this.temp = temp;
}

Cell.prototype.setShadow = function (shadow) {
    if (this.shadow) this._removeStyle('sd-' + this.shadow);
    if (shadow) this._addStyle('sd-' + shadow);
    this.shadow = shadow;
}

Cell.prototype._addStyle = function (type) {
    this.$e.classList.add('grid-cell-' + type);
};

Cell.prototype._removeStyle = function (type) {
    this.$e.classList.remove('grid-cell-' + type);
};


/**
 * A grid made up of cells
 * @constructor
 * @param {string} elementId ID of the element the grid will be displayed in
 * @param {number} rows number of rows
 * @param {number} cols number of columns
 */
function Grid(elementId, rows, cols) {
    this.$e = document.getElementById(elementId);
    this.$rows = [];

    this.width = cols;
    this.height = rows;
    this.grid = [];
    this.create();
}

// initialize the grid and display it
Grid.prototype.create = function () {
    for (var y = 0; y < this.height; y++) {
        var cells = [];
        var $div = document.createElement('div');
        $div.className += ' grid-row';

        for (var x = 0; x < this.width; x++) {
            var cell = new Cell(x, y).appendTo($div);
            cells.push(cell);
        }

        this.grid.push(cells);
        this.$rows.push($div);
        this.$e.appendChild($div);
    }
};

Grid.prototype.getCell = function (x, y) {
    return this.grid[y][x];
};

// check if the coordinate is within the bounds of the board
Grid.prototype.isValidCell = function (x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height)
        return false;
    return true;
};

// check if all the specified coordinates are within the bounds of the board
Grid.prototype.areValidCells = function (coords) {
    for (var i = 0; i < coords.length; i++) {
        if (!this.isValidCell(coords[i].x, coords[i].y))
            return false;
    }
    return true;
};

// check if all the specified coordinates are within the left, right, and bottom bounds of the board
Grid.prototype.checkBounds = function (coords) {
    for (var i = 0; i < coords.length; i++) {
        var c = coords[i];
        if (c.x < 0 || c.x >= this.width || c.y >= this.height)
            return false;
    }
    return true;
};

// check if the specified cell is empty
Grid.prototype.isCellEmpty = function (x, y) {
    if (y < 0) return true;
    return this.getCell(x, y).isEmpty();
};

// check if all the specified cells are empty
Grid.prototype.areCellsEmpty = function (cells) {
    for (var i = 0; i < cells.length; i++) {
        if (!this.isCellEmpty(cells[i].x, cells[i].y))
            return false;
    }
    return true;
};

Grid.prototype.clear = function () {
    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
            this.getCell(x, y).clear();
        }
    }
};

Grid.prototype.setTileOnCells = function (tile, cells) {
    for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        if (this.isValidCell(cell.x, cell.y))
            this.getCell(cell.x, cell.y).setTile(tile);
    }
};

Grid.prototype.setTempOnCells = function (tile, cells) {
    for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        if (this.isValidCell(cell.x, cell.y))
            this.getCell(cell.x, cell.y).setTemp(tile);
    }
};

Grid.prototype.setShadowOnCells = function (tile, cells) {
    for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        if (this.isValidCell(cell.x, cell.y))
            this.getCell(cell.x, cell.y).setShadow(tile);
    }
};


/**
 * A Grid with additional methods to support tetris gameplay
 * @constructor
 * @param {string} elementId ID of the element the grid will be displayed in
 * @param {number} rows number of rows
 * @param {number} cols number of columns
 */
function GameGrid(elementId, rows, cols) {
    Grid.call(this, elementId, rows, cols);

    this.block = null;
    this.shadow = null;
}

GameGrid.prototype = Object.create(Grid.prototype);
GameGrid.prototype.constructor = GameGrid;

// called every tick if game is not paused or over
// return { success: if block was moved, score: score delta, lines: line delta }
GameGrid.prototype.onTick = function () {
    if (this.block == null) return { success: false };

    var result = this.updateBlock(0);
    if (result.success) {
        return result;
    } else { // made contact with bottom / tiles
        this.block.grounded = true;
        this.setTempOnCells(null, this.block.getCells());
        this.setTileOnCells(this.block.getName(), this.block.getCells());
        this.updateShadow(null);
        // check for full rows
        var rows = this._checkRows(this.block.getRows());
        var numRows = rows.length;
        if (numRows) {
            this._clearRows(rows);
        }
        return { success: false, score: this._getScoreByRowsCleared(numRows), lines: numRows };
    }
};

// changes the current block
// return false if this fails (game lost)
GameGrid.prototype.changeBlock = function (block) {
    if (this.block) {
        this.setTempOnCells(null, this.block.getCells());
    }
    if (block) {
        var cells = block.getCells();
        if (this.areCellsEmpty(cells)) {
            this.setTempOnCells(block.getName(), block.getCells());
            this.updateShadow(block);
        } else { // game lost
            return false;
        }
    }
    this.block = block;
    return true;
};

// op: 0 move down, 1 move left, 2 move right, 3 rotate, 4 drop down
// return { success: if block was moved, score: score delta, lines: line delta }
GameGrid.prototype.updateBlock = function (op) {
    if (!this.block) return { success: false };
    if (this.block.grounded) return { success: false };

    switch (op) {
        case 0: // move down
            var success = this._shiftBlock(0, 1);
            return { success: success };
        case 1: // move left
            var success = this._shiftBlock(-1, 0);
            return { success: success };
        case 2: // move right
            var success = this._shiftBlock(1, 0);
            return { success: success };
        case 3: // transform
            var success = this._transformBlock();
            return { success: success };
        case 4: // drop down
            var distance = this._dropBlock();
            return { success: distance > 0, score: this._getScoreByDistanceDropped(distance), lines: 0 };
    }
    return { success: false };
};

GameGrid.prototype.updateShadow = function (block) {
    if (this.shadow) this.setShadowOnCells(null, this.shadow.getCells());
    if (block === undefined) block = this.block;
    if (!block) {
        this.shadow = null;
        return;
    }

    var newShadow = block.copy();
    newShadow.shift(0, this._getDistanceToGround(newShadow));
    this.setShadowOnCells(newShadow.getName(), newShadow.getCells());
    this.shadow = newShadow;
};

GameGrid.prototype._getScoreByRowsCleared = function (rows) {
    return Math.floor(Math.pow(rows, 1.2) * 5) * 10;
};

GameGrid.prototype._getScoreByDistanceDropped = function (distance) {
    return Math.floor(distance / 3);
};

// check if the specified rows are filled
// returns a list containing rows that are filled
GameGrid.prototype._checkRows = function (rows) {
    var result = [];
    for (var i = 0; i < rows.length; i++) {
        var y = rows[i];
        if (y < 0) continue;
        var filled = true;
        for (var x = 0; x < this.width; x++) {
            if (this.getCell(x, y).isEmpty()) {
                filled = false;
                break;
            }
        }
        if (filled) result.push(y);
    }
    return result;
};

// clear all specified rows and shift above rows downward
GameGrid.prototype._clearRows = function (rows) {
    for (var i = 0; i < rows.length; i++) {
        this._shiftCellsDown(rows[i]);
    }
};

// shift cells above the specified row down by 1 row
GameGrid.prototype._shiftCellsDown = function (row) {
    // iterate through every column and shift the tiles above the specified row
    for (var x = 0; x < this.width; x++) {
        for (var y = row; y > 0; y--) {
            this.getCell(x, y).setTile(this.getCell(x, y - 1).tile);
        }
    }
    // set the top row to empty
    for (var x = 0; x < this.width; x++) {
        this.getCell(x, 0).setTile(null);
    }
};

GameGrid.prototype._getDistanceToGround = function (block) {
    var distance = this.height;
    var lowest = block.getLowestCells();
    
    for (var i = 0; i < lowest.length; i++) {
        var cx = lowest[i].x;
        var cy = lowest[i].y;

        // already at ground
        if (cy + 1 == this.height) return 0;

        // determine the lowest position this cell can drop to
        var y = cy;
        while (this.isCellEmpty(cx, y + 1)) {
            y++;
            if (y == this.height - 1) break;
        }

        if (y - cy < distance)
            distance = y - cy;
    }
    return distance;
};

// drop the current block to ground
// return the distance the block moved
GameGrid.prototype._dropBlock = function () {
    if (this.block.grounded) return 0;
    var distance = this._getDistanceToGround(this.block);
    this.block.grounded = true;
    if (distance > 0) {
        this._shiftBlock(0, distance);
    }
    return distance;
};

// shift the current block by (dx, dy) amount
// returns false if unable to shift (due to grid boundary / non-empty tiles)
GameGrid.prototype._shiftBlock = function (dx, dy) {
    var cells = this.block.getCellsWithOffset(dx, dy);
    if (this.checkBounds(cells) && this.areCellsEmpty(cells)) {
        this.setTempOnCells(null, this.block.getCells());
        this.block.shift(dx, dy);
        this.setTempOnCells(this.block.getName(), this.block.getCells());
        if (dx !== 0) this.updateShadow(this.block);
        return true;
    }
    return false;
};

// transform the current block
// returns false if unable to transform (due to grid boundary / non-empty tiles)
GameGrid.prototype._transformBlock = function () {
    var cells = this.block.getTransformedCells(1);
    if (this.checkBounds(cells) && this.areCellsEmpty(cells)) {
        this.setTempOnCells(null, this.block.getCells());
        this.block.transform(1);
        this.setTempOnCells(this.block.getName(), this.block.getCells());
        this.updateShadow(this.block);
        return true;
    }
    return false;
};
