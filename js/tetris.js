'use strict';

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
    
    this.generator = new BlockGenerator(Math.floor(opts.cols / 2) - 2, -3);
    this.setupTemplates();

    this.grid = new GameGrid(opts.id, opts.rows, opts.cols);
    this.nextBlockGrid = new Grid('game-next-block', this.generator.getMaxSize(), this.generator.getMaxSize());
    this.tickRateStart = opts.tickRateStart || 11; // 1.1s
    this.tickRateEnd = opts.tickRateEnd || 5; // 0.5s
    this.tickRateStep = 6;

    // - state variables -
    this.tickRate = this.tickRateStart;
    this.clock = 0;
    this.paused = (opts.paused !== undefined) ? opts.paused : true;
    this.over = false;
    this.auto = false;
    this.fastForward = false;

    this.bestScore = 0;
    this.bestLines = 0;
    this.score = 0;
    this.lines = 0;
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

    this.nextBlock = this.generator.next();
    this._showNextBlock();
};

Tetris.prototype._showNextBlock = function () {
    this.nextBlockGrid.updateTempCells(this.nextBlock.getCellsFromOrigin(), this.nextBlock.getName());
};

Tetris.prototype._hideNextBlock = function () {
    this.nextBlockGrid.updateTempCells(this.nextBlock.getCellsFromOrigin(), null);
};

Tetris.prototype._flashElementText = function ($element) {
    $element.classList.remove('flash');
    setTimeout(function () {
        $element.classList.add('flash');
    }, 25);
};

Tetris.prototype.addScore = function (delta) {
    this.score += delta;
    if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.storageManager.setBestScore(this.bestScore);
        this.$bestScore.innerHTML = this.bestScore.toLocaleString();
        this._flashElementText(this.$bestScore);
    }
    this.$score.innerHTML = this.score.toLocaleString();
    this._flashElementText(this.$score);
};

Tetris.prototype.addLines = function (delta) {
    this.lines += delta;
    if (this.lines > this.bestLines) {
        this.bestLines = this.lines;
        this.storageManager.setBestLines(this.bestLines);
        this.$bestLines.innerHTML = this.bestLines.toLocaleString();
        this._flashElementText(this.$bestLines);
    }
    this.$lines.innerHTML = this.lines.toLocaleString();
    this._flashElementText(this.$lines);

    // increase difficulty over time
    if (this.tickRate > this.tickRateEnd) {
        var newTickRate = this.tickRateStart - Math.floor(this.lines / this.tickRateStep);
        if (newTickRate < this.tickRateEnd)
            newTickRate = this.tickRateEnd;
        if (newTickRate < this.tickRate) { // update tick rate
            this.tickRate = newTickRate;
            this.$floatingBox.classList.remove('hidden');
            var self = this;
            setTimeout(function () {
                self.$floatingBox.classList.add('hidden');
            }, 1400);
        }
    }
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
    this.tickRate = this.tickRateStart;
    this.clock = 0;
    this.over = false;
    this.fastForward = false;
    this.score = 0;
    this.lines = 0;
    this.blocks = 0;
    this.badluck = 0;
    this.generator.reset();
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

    this.$floatingBox = document.getElementById('grid-floating-box');
    this.$overlay = document.getElementById('grid-overlay');
    if (!this.paused) this.hideOverlay();
    this.$overlayText = document.getElementById('grid-overlay-text');
    this.$overlayButton = document.getElementById('grid-overlay-btn');

    this.bestScore = this.storageManager.getBestScore();
    this.$bestScore = document.getElementById('game-best-score');
    this.$bestScore.innerHTML = parseInt(this.storageManager.getBestScore()).toLocaleString();
    this.bestLines = this.storageManager.getBestLines();
    this.$bestLines = document.getElementById('game-best-lines');
    this.$bestLines.innerHTML = parseInt(this.storageManager.getBestLines()).toLocaleString();
    this.$score = document.getElementById('game-score');
    this.$lines = document.getElementById('game-lines');
};

Tetris.prototype.setupTemplates = function () {
    this.generator.addTemplate('i', 2, false, [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [2, 3, 2, 2],
        [0, 1, 0, 0]
    ]);
    this.generator.addTemplate('j', 4, false, [
        [0, 0, 0, 0],
        [0, 4, 5, 0],
        [8, 14, 9, 0],
        [0, 7, 11, 2]
    ]);
    this.generator.addTemplate('l', 4, false, [
        [0, 0, 0, 0],
        [0, 5, 4, 0],
        [0, 3, 14, 2],
        [8, 11, 13, 0]
    ]);
    this.generator.addTemplate('o', 1, true, [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0]
    ]);
    this.generator.addTemplate('t', 4, false, [
        [0, 0, 0, 0],
        [0, 11, 0, 0],
        [13, 15, 7, 0],
        [0, 14, 0, 0]
    ]);
    this.generator.addTemplate('s', 2, true, [
        [0, 0, 0, 0],
        [0, 2, 0, 0],
        [0, 3, 3, 0],
        [1, 1, 2, 0]
    ]);
    this.generator.addTemplate('z', 2, true, [
        [0, 0, 0, 0],
        [0, 0, 2, 0],
        [1, 3, 2, 0],
        [0, 3, 1, 0]
    ]);
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

    // grid overlay button (start/pause/restart)
    this.bindButtonPress('grid-overlay-btn', function (e) {
        e.preventDefault();
        self.emit('button');
    });

    // help panel
    var $statsOverlay = document.getElementById('stats-overlay');
    var $statsOverlayClose = document.getElementById('stats-overlay-close');
    this.bindButtonPress('game-stats-help', function (e) {
        e.preventDefault();
        $statsOverlay.classList.remove('fade-out');
        $statsOverlay.classList.remove('hidden');
    });
    this.bindButtonPress('stats-overlay-close', function (e) {
        e.preventDefault();
        $statsOverlay.classList.add('fade-out');
        setTimeout(function () { // hide overlay after it fades out
            if ($statsOverlay.classList.contains('fade-out')) {
                $statsOverlay.classList.remove('fade-out');
                $statsOverlay.classList.add('hidden');
            }
        }, 400);
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
