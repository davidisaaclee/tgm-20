/*
-- Examples

dfkkkkkkkkkdkksl

sjl;sfjll;sffjlll;sfffjllll

dksll

dkkkkjlflkkkk;dksll

dsdsssllllffffff

ssl

ljkkkkksl

ljkkkkksld

skkkkksldslllfkkkkk
*/

// -- Types -- //

function State(options) {
	const defaultOptions = {
		gridWidth: 10,
		gridHeight: 10
	};

	const opts =
		Object.assign({}, defaultOptions, options);

	return Object.assign(this, {
		grid: createGrid(
			opts.gridWidth,
			opts.gridHeight,
			chroma('black').alpha(0)),
		sourceCode: [],
		timestamp: 0
	});
}


function Command(options) {
	const defaultOptions = {
		makeSource: function (grid, mod) {
			return createGrid(
				grid.width, 
				grid.height, 
				chroma('black').alpha(0));
		},

		transform: function (grid, mod) {
			return grid;
		},

		// Returns an object mapping stack index to mod offset.
		modOffsets: function (timestamp, myIndex, myMod) {
			return {};
		}
	}

	const opts =
		Object.assign({}, defaultOptions, options);

	return Object.assign(this, {
		makeSource: opts.makeSource,
		transform: opts.transform,
		modOffsets: opts.modOffsets
	});
}

const colorCommand = new Command({
	makeSource: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		const hueOffset = Range.convert(floor(mod), {
			from: { lower: 0, upper: modRange },
			to: { lower: 0, upper: 360 }
		});
		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				const hue = Range.convert(x, {
					from: { lower: 0, upper: grid.width },
					to: { lower: 0, upper: 360 }
				});
				newGrid.tiles[x][y].color =
					chroma.hsl((hue + hueOffset) % 360, 1, 0.5);
			}
		}

		return newGrid;
	},

	transform: function (grid, mod) {
		var newGrid = cloneGrid(grid);
		var scaledMod = Range.convert(floor(mod), {
			from: { lower: 0 - 1, upper: modRange - 1 },
			to: { lower: 0, upper: 360 }
		});

		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				const oldColor = grid.tiles[x][y].color;
				const oldHue = oldColor.get('hsl.h');
				const newHue = (oldHue + scaledMod) % 360;

				newGrid.tiles[x][y].color =
					oldColor.set('hsl.h', newHue);
			}
		}

		return newGrid;
	},
});

const desyncCommand = new Command({
	
	makeSource: function (grid, mod) {
		var newGrid = cloneGrid(grid);
		const scaledMod = floor(Range.convert(mod, {
			from: {
				lower: 0,
				upper: modRange },
			to: {
				lower: 0,
				upper: grid.width },
		}));

		for (var x = 0; x < grid.width; x++) {
			for (var yOffset = 0; yOffset < ((scaledMod + 1) % grid.width); yOffset++) {
				const p = wrapGridCoordinate(x, x + scaledMod - yOffset, grid);
				newGrid.tiles[p.x][p.y].color = chroma('blue');
			}
		}

		return newGrid;
	},

	transform: function (grid, mod) {
		var newGrid = cloneGrid(grid);
		const scaledMod = floor(Range.convert(mod, {
			from: { lower: 0, upper: modRange },
			to: { lower: 0, upper: grid.width }
		}));

		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				if ((y % 2) == 0) {
					newGrid.tiles[x][y].color = grid.tiles[x][y].color;
				} else {
					const offset = -(scaledMod + 1);
					const dstCoordinate =
						wrapGridCoordinate(x + offset, y, grid);

					newGrid.tiles[dstCoordinate.x][dstCoordinate.y].color =
						grid.tiles[x][y].color;
				}
			}
		}

		return newGrid;
	},
});


const rotateCommand = new Command({
	makeSource: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		const scaledMod = Range.convert(floor(mod), {
			from: { lower: 0, upper: modRange },
			to: { lower: 0, upper: TWO_PI },
		});
		const scaledMod2 = pow(Math.sin(scaledMod), 5) + 1.5;

		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				const xr = Range.convert(x, {
					from: { lower: 0, upper: grid.width },
					to: { lower: 0, upper: TWO_PI }
				}) + scaledMod;

				const yr = Range.convert(y, {
					from: { lower: 0, upper: grid.height },
					to: { lower: 0, upper: TWO_PI }
				}) + scaledMod;

				newGrid.tiles[x][y].color =
					chroma.hsl(
						Math.cos(xr),
						255, 
						yr);

				const chris = Math.cos(floor(xr * scaledMod2) / scaledMod2);
				const nota = Math.sin(yr);

				newGrid.tiles[x][y].color =
					newGrid.tiles[x][y].color
						.alpha(min(1, max(0.5, chris - nota) - 0.4));
			}
		}

		return newGrid;
	},

	transform: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		const angle = Range.convert(floor(mod), {
			from: { lower: 0, upper: modRange },
			// Offset output so the default mod = 0 still rotates.
			to: { lower: 0 + 0.1, upper: TWO_PI + 0.1 }
		});

		// this is wrong
		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				const centeringOffset = {
					x: -grid.width / 2,
					y: -grid.height / 2
				};
				const rotationMatrix = [
					[Math.cos(angle), -Math.sin(angle)],
					[Math.sin(angle), Math.cos(angle)]
				];

				// Offset grid so that origin is in center of display.
				const offsetX = x + centeringOffset.x;
				const offsetY = y + centeringOffset.y;

				// Rotate around center of display.
				const rotatedPoint =
					applyTransform(rotationMatrix, { x: offsetX, y: offsetY });

				// Unoffset grid to bring back to original centering.
				const unoffsetX = rotatedPoint.x - centeringOffset.x;
				const unoffsetY = rotatedPoint.y - centeringOffset.y;

				// Wrap coordinate to grid.
				const dstCoordinate =
					wrapGridCoordinate(unoffsetX, unoffsetY, grid);

				newGrid.tiles[dstCoordinate.x][dstCoordinate.y] =
					grid.tiles[x][y];
			}
		}

		return newGrid;
	},
});



const animateCommand = new Command({
	makeSource: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				if (((y + floor(mod)) % 4) == 0) {
					newGrid.tiles[x][y].color = chroma('#0f0');
				}
			}
		}

		return newGrid;
	},

	modOffsets: function (t, myIndex, myMod) {
		return { [myIndex - 1]: t + myMod }
	}
});


const mirrorCommand = new Command({
	makeSource: function (grid, mod) {
		var newGrid = cloneGrid(grid);
		const chonk = floor(Math.sin(mod) * 5 + 5 + 2);

		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				if (floor(x + y + 0.5 * chonk) % chonk < (chonk / 2)) {
					newGrid.tiles[x][y].color = chroma('#ff0');
				}
					
			}
		}

		return newGrid;
	},

	transform: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		const scaledMod = floor(mod % 3);

		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				switch (scaledMod) {
					case 0:
						if (x > ((grid.width - 1) / 2)) {
							newGrid.tiles[x][y] =
								grid.tiles[(grid.width - 1) - x][y];
						} else {
							newGrid.tiles[x][y] =
								grid.tiles[x][y];
						}
						break;

					case 1:
						if (y > ((grid.height - 1) / 2)) {
							newGrid.tiles[x][y] =
								grid.tiles[grid.width - 1 - x][grid.height - 1 - y];
						} else {
							newGrid.tiles[x][y] =
								grid.tiles[x][y];
						}
						break;

					case 2:
						newGrid.tiles[x][y].color = chroma.mix(
							grid.tiles[((grid.width - 1) - x)][y].color,
							grid.tiles[x][y].color);
						break;
				}
			}
		}

		return newGrid;
	},
});


const offsetModCommand = new Command({
	makeSource: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		const leftEye =
			wrapGridCoordinate(
				grid.width / 3, 
				grid.width / 3, 
				grid);

		const rightEye =
			wrapGridCoordinate(
				grid.width - grid.width / 3,
				grid.width / 3,
				grid);

		const scaledMod = TWO_PI * mod / modRange;
		// const offset = (x) => floor(Math.sin(2 + scaledMod + x * 0.4) * 2) ;
		const offset = (x) => floor(Math.sin(x + scaledMod) * 1.2) ;

		var smile = [
			{ x: 5, y: offset(3) + 12 },
			{ x: 6, y: offset(2) + 12 },
			{ x: 7, y: offset(1) + 13 },
			{ x: 8, y: offset(0) + 14 },
			{ x: 9, y: offset(0) + 14 },
			{ x: 10, y: offset(0) + 14 },
			{ x: 11, y: offset(0) + 14 },
			{ x: 12, y: offset(1) + 13 },
			{ x: 13, y: offset(2) + 12 },
			{ x: 14, y: offset(3) + 12 },
		];

		newGrid.tiles[leftEye.x][leftEye.y].color =
			chroma('#0ff');
		newGrid.tiles[rightEye.x][rightEye.y].color =
			chroma('#0ff');

		smile.forEach((p) => {
			newGrid.tiles[p.x][p.y].color =
				chroma('#0ff');
		});
			

		return newGrid;
	},

	modOffsets: function (t, myIndex, myMod) {
		return { [myIndex - 1]: 1 + myMod }
	}
});















// -- Core -- //

const fps = 30;
var timescale = 1;
var isPaused = false;

var tileWidth = 40;
var tileHeight = 40;

const modRange = 20;

const gridSize = { width: 20, height: 20 };

const commands = [
	colorCommand,
	desyncCommand,
	rotateCommand,
	animateCommand,
	mirrorCommand,
	offsetModCommand
];

const srcContainer = document.querySelector('#source-code');
const canvasStage = document.querySelector('#stage');
const shareableTextArea = document.querySelector('#shareable-text');

// old  a s d f j k 
// new  l s j f d k

// a    s    d    f    j    k    l    _
// bksp dsnc miro colr rota incr anim layr

const commandToChar = {
	dsnc: 's',
	miro: 'd',
	colr: 'f',
	rota: 'j',
	incr: 'k',
	anim: 'l'
};

const charToCommand = {
	[commandToChar.dsnc]: desyncCommand,
	[commandToChar.miro]: mirrorCommand,
	[commandToChar.colr]: colorCommand,
	[commandToChar.rota]: rotateCommand,
	[commandToChar.incr]: offsetModCommand,
	[commandToChar.anim]: animateCommand
};

var state = new State({ 
	gridWidth: gridSize.width, 
	gridHeight: gridSize.height
});

function setup() {
	updateTileSize();

	const canvas = createCanvas(
		tileWidth * gridSize.width,
		tileHeight * gridSize.height);
	canvas.parent('stage');
}

function draw() {
	const dt = isPaused ? 0 : (timescale / fps);
	state = tick(dt, state);

	render(state);
}

function tick(dt, model) {
	const newTimestamp = model.timestamp + dt;

	return Object.assign(model, {
		timestamp: newTimestamp
	});

	return model;
}

function render(model) {
	function simplify(layerSource) {
		const source = layerSource.charAt(0);
		var transforms = layerSource.substr(1);

		if (transforms.length > 0) {
			var lastTransform = "";
			var simplifiedTransforms = "";

			for (var i = 0; i < transforms.length; i++) {
				switch (transforms.charAt(i)) {
					case commandToChar.colr:
						if (lastTransform == commandToChar.colr) {
							simplifiedTransforms += commandToChar.incr;
						} else {
							simplifiedTransforms += commandToChar.colr;
							lastTransform = commandToChar.colr;
						}
						break;

					case commandToChar.incr:
						simplifiedTransforms += commandToChar.incr;
						break;

					case commandToChar.anim:
						simplifiedTransforms += commandToChar.anim;
						break;

					default:
						simplifiedTransforms += transforms.charAt(i);
						lastTransform = transforms.charAt(i);
						break;
				}
			}

			transforms = simplifiedTransforms;
		}

		return `${source}${transforms}`;
	}

	function renderGrid(stackSource) {
		const stack = simplify(stackSource)
			.split('')
			.map((char) => charToCommand[char])
			.filter((cmd) => cmd != null);

		// Reverse stack so that we can accumulate mods from top to bottom.
		// This lets us use a command's own mod in its modsOffset method.
		stack.reverse();

		// Takes the reversed index of `stack` and returns the original index.
		const unreverseStackIndex = (idx) => (stack.length - 1) - idx;

		var mods = stack
			.reduce(
				(acc, elm, idx) =>
					// Merge the accumulated mods (`acc`) with the mods generated
					// by the call to `modOffsets` by adding them together.
					mergeBy(
						(target, ext) =>
							nullFallback(target, 0) + nullFallback(ext, 0), 
						acc, 
						elm.modOffsets(
							model.timestamp, 
							unreverseStackIndex(idx),
							nullFallback(acc[unreverseStackIndex(idx)], 0))),
				{});

		stack.reverse();

		return stack.reduce((grid, elm, idx) => {
			if (idx == 0) {
				return elm.makeSource(grid, nullFallback(mods[idx], 0) % modRange);
			} else {
				return elm.transform(grid, nullFallback(mods[idx], 0) % modRange);
			}
		}, model.grid);
	}

	function drawGrid(renderedGrid) {
		noStroke();
		let bleed = 1;
		for (var x = 0; x < model.grid.width; x++) {
			for (var y = 0; y < model.grid.height; y++) {
				fill(renderedGrid.tiles[x][y].color.css());
				rect(x * tileWidth - bleed, y * tileHeight - bleed, tileWidth + bleed * 2, tileHeight + bleed * 2);
			}
		}
	}

	background(0);
	model.sourceCode
		.filter((line) => line.length > 0)
		.map(renderGrid)
		.forEach(drawGrid);
}

















// -- Events -- //

function keyTyped() {
	if (shareableTextArea === document.activeElement) {
		return true;
	}

	if (charToCommand[key] != null) {
		addCommandChar(key);
		renderSourceCode();
	} else if (keyCode == 32) {
		isPaused = !isPaused;
		if (isPaused) {
			redraw();
			noLoop();
		} else {
			loop();
		}

		return false;
	} else if ((keyCode == 8) || (key == 'a')) {
		// Backspace was typed.
		backspace();
		renderSourceCode();
		return false;
	} else if ((keyCode == 13) || (keyCode == 59)) {
		// Enter or ; was typed.
		linebreak();
		renderSourceCode();
		return true;
	} else {
		console.log(keyCode);
		return true;
	}
}

function addCommandChar(cmdChar) {
	if (charToCommand[cmdChar] == null) {
		return;
	}

	if (state.sourceCode.length == 0) {
		state.sourceCode.push("");
	}

	state.sourceCode[state.sourceCode.length - 1] += cmdChar;
}

function linebreak() {
	state.sourceCode.push("");
}


function renderSourceCode() {
	function indicateSourceError() {
		srcContainer.classList.add('error');
		window.setTimeout(() => srcContainer.classList.remove('error'), 300);
	}

	// Keep it within tha limit
	while (state.sourceCode.length > 4) {
		state.sourceCode.pop();
		indicateSourceError();
	}

	state.sourceCode = state.sourceCode.map((ln) => {
		while (ln.length > 32) {
			ln = ln.substr(0, ln.length - 1);
			indicateSourceError();
		}
		return ln;
	});

	const lineElements = state.sourceCode
		.map((line) => {
			const div = document.createElement('div');
			div.classList.add('src-line');

			line
				.split('')
				.map((char, idx) => {
					const span = document.createElement('span');
					span.classList.add(`cmd-${char}`);
					span.classList.add('cmd-char');
					if (idx == 0) {
						span.classList.add('hd-char');
					}
					span.innerText = char;
					return span;
				})
				.forEach((elt) => div.appendChild(elt));

			return div;
		});

		// Remove all children.
		while (srcContainer.firstChild) {
			srcContainer.removeChild(srcContainer.firstChild);
		}

		lineElements.forEach((elt) => srcContainer.appendChild(elt));

		// Render to shareable text area.
    const selection = {
    	start: shareableTextArea.selectionStart,
      end: shareableTextArea.selectionEnd
    };

		shareableTextArea.value = state.sourceCode.join(';');

    // shareableTextArea.setSelectionRange(selection.start, selection.end);
}

function importSource(compressedSource) {
	function isValidSourceChar(char) {
		if (charToCommand[char] != null) {
			return true;
		}

		if (char == ';') {
			return true;
		}

		return false;
	}

	const validatedCode =
		compressedSource
			.split('')
			.filter(isValidSourceChar)
			.join('');

	state.sourceCode = validatedCode.split(';');

	renderSourceCode();
}

function simulateKeypress(char) {
	if (char == 'bksp')  {
		backspace();
	} else if (char == 'layr') {
		linebreak();
	} else {
		addCommandChar(char);
	}
	renderSourceCode();
}


function windowResized() {
	updateTileSize();
	resizeCanvas(
		tileWidth * gridSize.width,
		tileHeight * gridSize.height);
}


function handleCopySource() {
	shareableTextArea.select();
	document.execCommand('copy');
}


















// -- Helpers -- //

function backspace() {
	if (state.sourceCode.length == 0) {
		return;
	}

	// lol
	var lastLine = state.sourceCode[state.sourceCode.length - 1];
	if (lastLine.length == 0) {
		state.sourceCode =
			state.sourceCode.slice(0, state.sourceCode.length - 1);

		if (state.sourceCode.length > 0) {
			var lastLine = state.sourceCode[state.sourceCode.length - 1];
			lastLine = lastLine.slice(0, lastLine.length - 1);
			state.sourceCode[state.sourceCode.length - 1] =
				lastLine;
		}
	} else {
		lastLine = lastLine.slice(0, lastLine.length - 1);
		state.sourceCode[state.sourceCode.length - 1] =
			lastLine;
	}
}

function createGrid(width, height, color) {
	const createColor = typeof color === 'function'
		? color
		: () => color;

	var tiles = [];
	for (var x = 0; x < width; x++) {
		tiles.push([]);
		for (var y = 0; y < height; y++) {
			tiles[x].push({ color: createColor(x, y) });
		}
	}

	return {
		width: width,
		height: height,
		tiles: tiles,
	};
}

function cloneGrid(grid) {
	return createGrid(
		grid.width, 
		grid.height,
		(x, y) => grid.tiles[x][y].color);
}

function wrapGridCoordinate(x, y, grid) {
	return {
		x: floor(Math.abs(grid.width + x) % grid.width),
		y: floor(Math.abs(grid.height + y) % grid.height),
	};
}

function applyTransform(matrix, vector) {
	return {
		x: matrix[0][0] * vector.x + matrix[0][1] * vector.y,
		y: matrix[1][0] * vector.x + matrix[1][1] * vector.y
	};
}

/*
Merges two objects using a custom reduction.

		const reducer = (targetField, extField, key) => {
			if (targetField == null) {
				return extField;
			} else {
				return extField + targetField;
			}
		};
		mergeBy(reducer, { a: 3, c: 0 }, { a: 2, b: 1 }, )
		==> { a: 5, b: 1, c: 0 }
		
*/
function mergeBy(reducer, target, extensions) {
	return Object.keys(extensions)
		.reduce((acc, key) => {
			acc[key] = reducer(acc[key], extensions[key], key)
			return acc;
		}, target);
}


function nullFallback(valueOrNull, fallback) {
	return (valueOrNull == null) ? fallback : valueOrNull;
}

function updateTileSize() {
	const bounds = canvasStage.getBoundingClientRect();
	tileWidth = bounds.width / gridSize.width;
	tileHeight = bounds.height / gridSize.height;
}

// Range : { lower : Number, upper : Number }
const Range = {
	span: (range) => range.upper - range.lower,

	// convert(3, { from: range1, to: range2 })
	// convert(3, { to: range2, from: range1 })
	convert: (value, options) =>
		(value - options.from.lower) 
			/ Range.span(options.from)
			* Range.span(options.to)
			+ options.to.lower,

	clamp: (value, range) =>
		Math.max(range.lower, Math.min(range.upper, value)),

	normalize: (value, range, shouldClamp) => {
		const willClamp = (shouldClamp === undefined)
			? false
			: shouldClamp;
		const normalizedRange = { lower: 0, upper: 1 };
		var retval = Range.convert(value, { 
			from: range, 
			to: normalizedRange
		});

		if (willClamp) {
			retval = Range.clamp(retval, normalizedRange);
		}

		return retval;
	}
};
