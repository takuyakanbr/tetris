

/**
 * @constructor
 * @param {Object} generator BlockGenerator
 */
function AI(generator) {
    this.generator = generator;
    this.spawnX = generator.spawnX;
    this.spawnY = generator.spawnY;
    this.templateCount = generator.getTemplateCount();

    this.moves = []; // list of integer op-codes
    this.block = null; // block associated with the moves

    this.height = 0;
    this.width = 0;
    this.grid = [];

    this._high = [];
}

AI.prototype.OP_LEFT = 1;
AI.prototype.OP_RIGHT = 2;
AI.prototype.OP_TRANSFORM = 3;
AI.prototype.OP_DROPDOWN = 4;

// calculate the score of the grid in its current state
AI.prototype._calculateScore = function () {
    var score = 1000;
    var height = this.height;
    var high = this._high;

    for (var x = 0; x < this.width; x++) high[x] = height;

    // penalize empty holes, and award full rows
    for (var y = 0; y < height; y++) {
        var full = true;
        for (var x = 0; x < this.width; x++) {
            if (!this.grid[y][x]) {
                full = false;
                if (high[x] !== height)
                    score -= 20 + (height - y) * 2;
            } else {
                if (high[x] === height)
                    high[x] = y;
            }
        }
        if (full) score += 65;
    }

    score -= (height - high[0]) ** 1.6;
    for (var x = 1; x < this.width; x++) {
        // penalize high columns
        if (x == this.width - 1)
            score -= (height - high[x]) ** 1.6;
        else
            score -= (height - high[x]) ** 1.7;

        // penalize big column height differences
        var diff = high[x] - high[x - 1];
        if (diff < 0) diff *= -1;
        if (diff > 3) score -= diff * 5;
    }

    return score;
};

AI.prototype._updateCells = function (coords, ox, oy, bool) {
    for (var i = 0; i < coords.length; i++) {
        var c = coords[i];
        if (c.y + oy >= 0) this.grid[c.y + oy][c.x + ox] = bool;
    }
};

// check if all coordinates, after the given offset,
// are within left, right bounds, and empty
AI.prototype._checkCoords = function (coords, ox, oy) {
    for (var i = 0; i < coords.length; i++) {
        var x = coords[i].x + ox;
        var y = coords[i].y + oy;
        if (x < 0 || x >= this.width) // out of bounds
            return false;
        if (y < 0) continue;
        if (this.grid[y][x]) // occupied
            return false;
    }
    return true;
};

AI.prototype._getDistanceToGround = function (template, form, ox, oy) {
    var distance = this.height;
    var lowest = template.getLowestCellsFromOrigin(form, ox, oy);

    for (var i = 0; i < lowest.length; i++) {
        var cx = lowest[i].x;
        var cy = lowest[i].y;

        // already at ground
        if (cy + 1 == this.height) return 0;

        // determine the lowest position this cell can drop to
        var y = cy;
        while (y + 1 < 0 || !this.grid[y + 1][cx]) {
            y++;
            if (y == this.height - 1) break;
        }

        if (y - cy < distance)
            distance = y - cy;
    }
    return distance;
};

AI.prototype._doMeanNode = function () {
    var score = -100000;
    for (var i = 0; i < this.templateCount; i++) {
        score += this._doMaxNode(this.generator.getTemplate(i));
    }
    return score / this.templateCount;
};

AI.prototype._doMaxNode = function (template) {
    var sx = this.spawnX;
    var sy = this.spawnY;
    var bestScore = -100000;

    for (var form = 0; form < template.forms; form++) {
        var dx = 0;
        var reverse = false;
        var cells = template.getCells(form);

        while (true) {
            var x = sx + dx;
            if (this._checkCoords(cells, x, sy)) {
                var dy = this._getDistanceToGround(template, form, x, sy);
                this._updateCells(cells, x, sy + dy, true);
                var score = this._calculateScore();
                if (score > bestScore)
                    bestScore = score;
                this._updateCells(cells, x, sy + dy, false);
                if (reverse) dx--;
                else dx++;
            } else {
                if (reverse) break;
                dx = -1;
                reverse = true;
            }
        }
    }
    return bestScore;
};

AI.prototype._getBestResult = function (block) {
    var bx = block.x;
    var by = block.y;
    var bestScore = -100000;
    var bestForm = block.form;
    var bestX = block.x;
    var template = block.template;

    for (var form = 0; form < template.forms; form++) {
        var dx = 0;
        var reverse = false;
        var cells = template.getCells(form);

        while (true) {
            var x = bx + dx;
            if (this._checkCoords(cells, x, by)) {
                var dy = this._getDistanceToGround(template, form, x, by);
                this._updateCells(cells, x, by + dy, true);
                var score = this._doMeanNode();
                if (score > bestScore) {
                    bestScore = score;
                    bestForm = form;
                    bestX = x;
                }
                this._updateCells(cells, x, by + dy, false);
                if (reverse) dx--;
                else dx++;
            } else {
                if (reverse) break;
                dx = -1;
                reverse = true;
            }
        }
    }
    return { score: bestScore, form: bestForm, x: bestX };
};

AI.prototype._generateMoves = function (tiles, block) {
    this.height = tiles.length;
    this.width = tiles[0].length;
    this.grid = [];
    this._high = [];
    for (var x = 0; x < this.width; x++) this._high.push(this.height);
    // create a 2D boolean array to track whether a tile is occupied
    for (var y = 0; y < this.height; y++) {
        var row = [];
        for (var x = 0; x < this.width; x++) {
            row.push(!tiles[y][x].isEmpty());
        }
        this.grid.push(row);
    }

    // determine best outcome
    var result = this._getBestResult(block);

    // make the necessary transform moves
    var moves = [];
    var formDelta = result.form - block.form;
    if (formDelta < 0) formDelta += block.getForms();
    for (var i = 0; i < formDelta; i++)
        moves.push(this.OP_TRANSFORM);

    // make the necessary left/right moves
    var xDelta = result.x - block.x;
    while (xDelta > 0) {
        moves.push(this.OP_RIGHT);
        xDelta--;
    }
    while (xDelta < 0) {
        moves.push(this.OP_LEFT);
        xDelta++;
    }

    moves.push(this.OP_DROPDOWN);
    return moves;
};

AI.prototype.getNextMove = function (grid, block) {
    if (block !== this.block) {
        var moves = this._generateMoves(grid, block);
        this.moves = moves;
        this.block = block;
    }
    return this.moves.shift() || -1;
};
