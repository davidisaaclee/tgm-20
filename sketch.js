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


const fps = 30;
var timescale = 1;
var isPaused = false;


// -- Types -- //

function State(options) {
	const defaultOptions = {
		gridWidth: 8,
		gridHeight: 6
	};

	const opts =
		Object.assign({}, defaultOptions, options);

	return Object.assign(this, {
		grid: createGrid(opts.gridWidth, opts.gridHeight, chroma('black')),
		// stack : [ { command : Command, mods : { stackIndex -> Float } } ]
		stack: []
	});
}


function Command(options) {
	const defaultOptions = {
		makeSource: function (grid, mod) {
			return createGrid(grid.width, grid.height, chroma('black'));
		},

		transform: function (grid, mod) {
			return grid;
		},

		tick: function (dt, mods, myIndex) {
			return mods;
		}
	}

	const opts =
		Object.assign({}, defaultOptions, options);

	return Object.assign(this, {
		makeSource: opts.makeSource,
		transform: opts.transform,
		tick: opts.tick
	});
}

const colorCommand = new Command({
	makeSource: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		const hueOffset = Range.convert(mod, {
			from: { lower: 0, upper: 10 },
			to: { lower: 0, upper: 360 }
		});
		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				const hue = Range.convert(x, {
					from: { lower: 0, upper: grid.width },
					to: { lower: 0, upper: 360 }
				});
				newGrid.tiles[x][y].color = chroma.hsl((hue + hueOffset) % 360, 1, 0.5);
			}
		}

		return newGrid;
	},

	transform: function (grid, mod) {
		var newGrid = cloneGrid(grid);
		var scaledMod = Range.convert(mod, {
			from: { lower: 0, upper: 10 },
			to: { lower: 0, upper: 360 }
		})

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

		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				if (((y + floor(mod)) % 4) == 0) {
					newGrid.tiles[x][y].color = chroma('lightgreen');
				}
			}
		}

		return newGrid;
	},

	transform: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				if ((y % 2) == 0) {
					newGrid.tiles[x][y].color = grid.tiles[x][y].color;
				} else {
					const offset = -(mod + 1);
					const dstCoordinate = wrapGridCoordinate(x + offset, y, grid);

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

		const scaledMod = Range.convert(mod, {
			from: { lower: 0, upper: 10 },
			to: { lower: 0, upper: TWO_PI },
		})

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
					chroma.hsl(Math.cos(xr), Math.cos(yr), Math.cos(xr) - Math.sin(yr));
			}
		}

		return newGrid;
	},

	transform: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		const angle = Range.convert(mod, {
			from: { lower: 0, upper: 10 },
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
				const dstCoordinate = wrapGridCoordinate(unoffsetX, unoffsetY, grid);

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
		const scaledMod = floor(Range.convert(mod, {
			from: { lower: 0, upper: 10 },
			to: { lower: 0, upper: grid.width },
		}));

		for (var x = 0; x < grid.width; x++) {
			for (var y = 0; y < grid.height; y++) {
				if (x == scaledMod) {
					newGrid.tiles[x][y].color = chroma('blue');
				} else {
					newGrid.tiles[x][y].color = chroma('black');
				}
			}
		}

		return newGrid;
	},

	transform: function (grid, mod) {
		var newGrid = cloneGrid(grid);

		// // Offset by 1 so default mod = 0 still affects.
		// const scaledMod = Range.convert(mod + 1, {
		// 	from: { lower: 0 + 1, upper: 10 + 1 },
		// 	to: { lower: 0, upper: grid.width },
		// });

		// for (var x = 0; x < grid.width; x++) {
		// 	for (var y = 0; y < grid.height; y++) {
		// 		if (x == scaledMod) {
		// 			const dstCoordinate = 
		// 				wrapGridCoordinate(grid, { x: x + scaledMod, y: y });

		// 			newGrid.tiles[dstCoordinate.x][dstCoordinate.y].color =
		// 				grid.tiles[x][y].color;
		// 		}
		// 	}
		// }

		return newGrid;
	},

	tick: function (dt, mods, myIndex) {
		if (mods[myIndex - 1] == null) {
			mods[myIndex - 1] = 0;
		}

		mods[myIndex - 1] += dt;
		mods[myIndex - 1] %= 10;

		return mods;
	}
});




// -- Core -- //

const commands = [
	colorCommand,
	desyncCommand,
	rotateCommand,
	animateCommand
];

const charToCommandIndex = {
	'a': 0,
	's': 1,
	'd': 2,
	'f': 3
};

var state = new State({ 
	gridWidth: 8, 
	gridHeight: 6
});

function setup() {
	createCanvas(
		windowWidth, 
		windowHeight);
}

function draw() {
	const dt = isPaused ? 0 : (timescale / fps);
	state = tick(dt, state);

	render(state);
}

function tick(dt, model) {
	model.stack = model.stack
		.map((elm, idx) =>
			Object.assign(elm, { mods: elm.command.tick(dt, elm.mods, idx) }));

	return model;
}

const tileSize = 40;
function render(model) {
	const allMods = model.stack.map((elm) => elm.mods);
	var mods = model.stack.map((_, stackIdx) =>
		allMods
			.filter((mod) => mod[stackIdx] != undefined)
			.reduce((acc, mod) => acc + mod[stackIdx], 0));

	const renderedGrid = model.stack.reduce((grid, elm, idx) => {
		if (idx == 0) {
			return elm.command.makeSource(grid, mods[idx]);
		} else {
			return elm.command.transform(grid, mods[idx]);
		}
	}, model.grid);

	noStroke();
	for (var x = 0; x < model.grid.width; x++) {
		for (var y = 0; y < model.grid.height; y++) {
			fill(renderedGrid.tiles[x][y].color.hex());
			rect(x * tileSize, y * tileSize, tileSize, tileSize);
		}		
	}
}

// -- Events -- //

function keyTyped() {
	if (charToCommandIndex[key] != null) {
		state.stack.push({ command: commands[charToCommandIndex[key]], mods: {} });
		return false;
	} else if (keyCode == 13) {
		// If "Enter" was typed...
		state.stack = [];
		return false;
	} else if (keyCode == 32) {
		isPaused = !isPaused;
		if (isPaused) {
			redraw(); 
			noLoop();
		} else {
			loop();
		}

		return false;
	} else if (keyCode == 8) {
		state.stack.pop();

		return false;
	} else {
		// console.log(keyCode);
		return true;
	}
}


// -- Helpers -- //

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