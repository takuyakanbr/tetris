
// returns a random integer between min (inclusive) and max (exclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}


/**
 * @constructor
 * @param {Object} opts options
 */
function Tetris(opts) {

    // - static variables -
    this.inputManager = new InputManager();
    this.storageManager = new StorageManager();
    this.templates = [];
    this.largestBlock = 0;
    this.setupTemplates();
    this.spawnX = Math.floor(opts.cols / 2) - 2;
    this.spawnY = -3;
    this.grid = new GameGrid(opts.id, opts.rows, opts.cols);
    this.nextBlockGrid = new Grid('game-next-block', this.largestBlock, this.largestBlock);

    // - state variables -
    this.tickRate = opts.tickRate || 8; // default is every 0.8s
    this.clock = 0;
    this.paused = (opts.paused !== undefined) ? opts.paused : true;
    this.over = false;
    this.auto = false;
    this.fastForward = false;

    this.bestScore = 0;
    this.bestLines = 0;
    this.score = 0;
    this.lines = 0;
    this.blocks = 0;
    this.badluck = 0;
    this.nextBlock = null;

    // - setup -
    this.setup();
    this.restart();

    var self = this;
    setInterval(function () {
        if (self.paused || self.over) return;
        self.clock = (self.clock + 1) % self.tickRate;
        if (self.clock == 0) {
            self.onTick();
        } else if (self.fastForward) {
            self.onTick();
            self.fastForward = false;
        }
    }, 100);
}

// select a random next block
Tetris.prototype.makeNextBlock = function () {
    if (this.nextBlock !== null)
        this._hideNextBlock();

    var tps = this.templates;
    var next = getRandomInt(0, tps.length);

    // ensure 's' and 'z' don't appear as first 2 tiles or more than 4 times in a row
    if (this.blocks <= 1 || this.badluck >= 4) {
        while (tps[next].name == 's' || tps[next].name == 'z')
            next = getRandomInt(0, tps.length);
    }

    this.nextBlock = new Block(tps[next], this.spawnX, this.spawnY);
    this._showNextBlock();
    this.blocks++;
    if (tps[next].name == 's' || tps[next].name == 'z') this.badluck++;
    else this.badluck = 0;
};

Tetris.prototype._showNextBlock = function () {
    this.nextBlockGrid.updateTempCells(this.nextBlock.getCellsFromOrigin(), this.nextBlock.getName());
};

Tetris.prototype._hideNextBlock = function () {
    this.nextBlockGrid.updateTempCells(this.nextBlock.getCellsFromOrigin(), null);
};

Tetris.prototype.addScore = function (delta) {
    this.score += delta;
    if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.storageManager.setBestScore(this.bestScore);
        this.$bestScore.innerHTML = this.bestScore.toLocaleString();
    }
    this.$score.innerHTML = this.score.toLocaleString();
};

Tetris.prototype.addLines = function (delta) {
    this.lines += delta;
    if (this.lines > this.bestLines) {
        this.bestLines = this.lines;
        this.storageManager.setBestLines(this.bestLines);
        this.$bestLines.innerHTML = this.bestLines.toLocaleString();
    }
    this.$lines.innerHTML = this.lines.toLocaleString();
};

Tetris.prototype.hideOverlay = function () {
    this.$overlay.classList.add('hidden');
};

Tetris.prototype.showOverlay = function (message, buttonText) {
    this.$overlayText.innerHTML = message;
    this.$overlayButton.innerHTML = buttonText;
    this.$overlay.classList.remove('hidden');
};

Tetris.prototype.restart = function () {
    this.clock = 0;
    this.over = false;
    this.fastForward = false;
    this.score = 0;
    this.lines = 0;
    this.blocks = 0;
    this.badluck = 0;
    this.makeNextBlock();
    this.grid.changeBlock(null);
    this.grid.clear();
    this.$score.innerHTML = '0';
    this.$lines.innerHTML = '0';
};

Tetris.prototype.move = function (op) {
    if (this.paused || this.over) return;
    if (op === 5) {
        this.fastForward = true;
        return;
    }
    var result = this.grid.updateBlock(op);
    if (result.score) this.addScore(result.score);
    if (op === 4) this.fastForward = true;
};

Tetris.prototype.pause = function () {
    if (this.over) return;
    this.paused = !this.paused;
    if (this.paused) this.showOverlay('Game paused', 'Resume');
    else this.hideOverlay();
};

Tetris.prototype.handleOverlayButton = function () {
    if (this.over) {
        this.restart();
    } else if (this.paused) {
        this.paused = false;
    }
    this.hideOverlay();
};

// called every tick if game is not paused or over
Tetris.prototype.onTick = function () {
    var result = this.grid.onTick();
    if (!result.success) {
        if (result.score) this.addScore(result.score);
        if (result.lines) this.addLines(result.lines);
        if (this.grid.changeBlock(this.nextBlock)) {
            this.makeNextBlock();
        } else { // game over
            this.showOverlay('Game over', 'Restart');
            this.over = true;
        }
    }
};

Tetris.prototype.setup = function () {
    var self = this;

    this.inputManager.on('move', function (data) {
        self.move(data);
    });
    this.inputManager.on('pause', function () {
        self.pause();
    });
    this.inputManager.on('button', function () {
        self.handleOverlayButton();
    });

    this.$overlay = document.getElementById('grid-overlay');
    if (!this.paused) this.hideOverlay();
    this.$overlayText = document.getElementById('grid-overlay-text');
    this.$overlayButton = document.getElementById('grid-overlay-btn');

    this.bestScore = this.storageManager.getBestScore();
    this.$bestScore = document.getElementById('game-best-score');
    this.$bestScore.innerHTML = this.storageManager.getBestScore();
    this.bestLines = this.storageManager.getBestLines();
    this.$bestLines = document.getElementById('game-best-lines');
    this.$bestLines.innerHTML = this.storageManager.getBestLines();
    this.$score = document.getElementById('game-score');
    this.$lines = document.getElementById('game-lines');
};

Tetris.prototype.setupTemplates = function () {
    // position of the block for 1st direction: right-most bit of each element, 
    // 2nd direction: 2nd right-most bit, and so on
    this._setupTemplate('i', 2, [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [2, 3, 2, 2],
        [0, 1, 0, 0]
    ]);
    this._setupTemplate('j', 4, [
        [0, 0, 0, 0],
        [0, 4, 5, 0],
        [8, 14, 9, 0],
        [0, 7, 11, 2]
    ]);
    this._setupTemplate('l', 4, [
        [0, 0, 0, 0],
        [0, 5, 4, 0],
        [0, 3, 14, 2],
        [8, 11, 13, 0]
    ]);
    this._setupTemplate('o', 1, [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0]
    ]);
    this._setupTemplate('t', 4, [
        [0, 0, 0, 0],
        [0, 11, 0, 0],
        [13, 15, 7, 0],
        [0, 14, 0, 0]
    ]);
    this._setupTemplate('s', 2, [
        [0, 0, 0, 0],
        [0, 2, 0, 0],
        [0, 3, 3, 0],
        [1, 1, 2, 0]
    ]);
    this._setupTemplate('z', 2, [
        [0, 0, 0, 0],
        [0, 0, 2, 0],
        [1, 3, 2, 0],
        [0, 3, 1, 0]
    ]);
};

Tetris.prototype._setupTemplate = function (name, directions, grid) {
    if (grid.length > this.largestBlock)
        this.largestBlock = grid.length;
    this.templates.push(new BlockTemplate(name, directions, grid));
};


/**
 * Handles keyboard, swipe, and mouse events
 * @constructor
 */
function InputManager() {
    this.events = {};
    this.listen();
}

InputManager.prototype.on = function (evt, callback) {
    if (!this.events[evt]) {
        this.events[evt] = [];
    }
    this.events[evt].push(callback);
};

InputManager.prototype.emit = function (evt, data) {
    var callbacks = this.events[evt];
    if (callbacks) {
        callbacks.forEach(function (callback) {
            callback(data);
        });
    }
};

InputManager.prototype.bindButtonPress = function (elementId, fn) {
    var button = document.getElementById(elementId);
    button.addEventListener('click', fn);
    button.addEventListener('touchend', fn);
};

InputManager.prototype.listen = function () {
    var self = this;
    
    var map = {
        // move left
        37: 1, // left
        72: 1, // vim left
        65: 1, // A
        // move right
        39: 2, // right
        76: 2, // vim right
        68: 2, // D
        // rotate
        38: 3, // up
        75: 3, // vim up
        87: 3, // W
        // drop down
        32: 4, // space
        // fast forward
        40: 5, // down
        74: 5, // vim down
        83: 5  // S
    };

    document.addEventListener('keydown', function (e) {
        var modifiers = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
        var mapped = map[e.which];

        if (!modifiers) {
            if (mapped !== undefined) {
                e.preventDefault();
                self.emit('move', mapped);
            } else if (e.which == 80 || e.which == 27) { // P / esc = pause
                e.preventDefault();
                self.emit('pause');
            }
        }
    });

    this.bindButtonPress('grid-overlay-btn', function (e) {
        e.preventDefault();
        self.emit('button');
    });
};


/**
 * Provide storage capability for Tetris
 * @constructor
 */
function StorageManager() {
    this.storage = this._isSupported('localStorage') ? window.localStorage : window.sessionStorage;
}

StorageManager.prototype.getBestScore = function () {
    return this.storage.getItem('tBestScore') || 0;
};

StorageManager.prototype.getBestLines = function () {
    return this.storage.getItem('tBestLines') || 0;
};

StorageManager.prototype.setBestScore = function (score) {
    this.storage.setItem('tBestScore', score);
};

StorageManager.prototype.setBestLines = function (lines) {
    this.storage.setItem('tBestLines', lines);
};

StorageManager.prototype._isSupported = function (type) {
    try {
        var storage = window[type],
            x = '_storage_test_';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return false;
    }
};


window.requestAnimationFrame(function () {
    new Tetris({ id: 'game-grid', rows: 20, cols: 12 });
});
