

/**
 * @constructor
 * @param {Object} generator BlockGenerator
 */
function AI(generator) {
    this.generator = generator;
    this.moves = []; // list of integer op-codes
                     // 1 - left, 2 - right, 3 - transform, 4 - drop down, 5 - fast forward
    this.block = null; // block associated with the moves
    this.blockCount = 0;
    this.moveCount = 0;

    var OP_LEFT = 1;
    var OP_RIGHT = 2;
    var OP_TRANSFORM = 3;
    var OP_DROPDOWN = 4;

    var height = 0;
    var width = 0;
    var grid = [];

    function calculateScore() {
        var score = 1000;
        var high = [];

        for (var x = 0; x < width; x++) high.push(null);

        for (var y = 0; y < height; y++) {
            var full = true;
            for (var x = 0; x < width; x++) {
                if (!grid[y][x]) {
                    full = false;
                    if (high[x] !== null)
                        score -= 30 + (height - y) * 2;
                } else {
                    if (high[x] === null)
                        high[x] = y;
                }
            }
            if (full) score += 50;
        }

        for (var x = 0; x < width; x++) {
            if (high[x] === null) high[x] = height;
            if (x == 0 || x == width - 1)
                score -= (height - high[x]) ** 1.5;
            else 
                score -= (height - high[x]) ** 1.6;
        }

        return score;
    }

    function updateCells(coords, bool) {
        coords.forEach(function (c) {
            if (c.y >= 0) grid[c.y][c.x] = bool;
        });
    }

    // check if all coordinates are within left, right, bottom bounds, and empty
    function checkCoords(coords) {
        for (var i = 0; i < coords.length; i++) {
            var x = coords[i].x;
            var y = coords[i].y;
            if (x < 0 || x >= width || y >= height) // out of bounds
                return false;
            if (y < 0) continue;
            if (grid[y][x]) // occupied
                return false;
        }
        return true;
    }

    function getGroundedCells(block, x, form) {
        var y = block.y;
        var result = null;
        while (true) {
            var cells = block.getCellsFromOrigin(x, y, form);
            if (checkCoords(cells)) {
                result = cells;
                y++;
            } else break;
        }
        return result;
    }

    function doMeanNode() {
        var score = 0;
        var count = generator.getTemplateCount();
        for (var i = 0; i < count; i++) {
            var block = generator.getBlockById(i);
            score += doMaxNode(block);
        }
        return score / count;
    }

    function doMaxNode(block) {
        var bx = block.x;
        var by = block.y;
        var bestScore = -100000;

        for (var form = 0; form < block.getForms(); form++) {
            var x = bx;
            var reverse = false;

            while (true) {
                if (checkCoords(block.getCellsFromOrigin(x, by, form))) {
                    var cells = getGroundedCells(block, x, form);
                    updateCells(cells, true);
                    var score = calculateScore();
                    if (score > bestScore)
                        bestScore = score;
                    updateCells(cells, false);
                    if (reverse) x--;
                    else x++;
                } else {
                    if (reverse) break;
                    x = bx - 1;
                    reverse = true;
                }
            }
        }
        return bestScore;
    }

    function getBestResult(block) {
        var bx = block.x;
        var by = block.y;
        var bestScore = -100000;
        var bestForm = block.form;
        var bestX = block.x;

        for (var form = 0; form < block.getForms(); form++) {
            var x = bx;
            var reverse = false;

            while (true) {
                if (checkCoords(block.getCellsFromOrigin(x, by, form))) {
                    var cells = getGroundedCells(block, x, form);
                    updateCells(cells, true);
                    var score = doMeanNode();
                    if (score > bestScore) {
                        bestScore = score;
                        bestForm = form;
                        bestX = x;
                    }
                    updateCells(cells, false);
                    if (reverse) x--;
                    else x++;
                } else {
                    if (reverse) break;
                    x = bx - 1;
                    reverse = true;
                }
            }
        }
        return { score: bestScore, form: bestForm, x: bestX };
    }

    function generateMoves(tiles, block) {
        height = tiles.length;
        width = tiles[0].length;
        grid = [];
        // create a 2D boolean array to track whether a tile is occupied
        for (var y = 0; y < height; y++) {
            var row = [];
            for (var x = 0; x < width; x++) {
                row.push(!tiles[y][x].isEmpty());
            }
            grid.push(row);
        }

        // determine best outcome
        var result = getBestResult(block);

        // make the necessary transform moves
        var moves = [];
        var formDelta = result.form - block.form;
        if (formDelta < 0) formDelta += block.getForms();
        for (var i = 0; i < formDelta; i++)
            moves.push(OP_TRANSFORM);

        // make the necessary left/right moves
        var xDelta = result.x - block.x;
        while (xDelta > 0) {
            moves.push(OP_RIGHT);
            xDelta--;
        }
        while (xDelta < 0) {
            moves.push(OP_LEFT);
            xDelta++;
        }

        moves.push(OP_DROPDOWN);
        return moves;
    }

    this.getNextMove = function (grid, block) {
        if (block !== this.block) {
            var moves = generateMoves(grid, block);
            this.moves = moves;
            this.block = block;
        }
        return this.moves.shift() || -1;
    };
}
