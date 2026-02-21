import { useState, useEffect } from 'react';
import { Text, Box, useInput, useStdout, render } from 'ink';
import { evaluate } from 'mathjs';
// import React from 'react'; // idk why but we need this here for builds but not compiles. idk what we even need the build for tbh, probably will remove it
// import "./yoga.wasm" with { type: "file" }; // this was apparently a fix for the yoga.wasm problem, but didn't work for me

// resize window. Stole it from someone online
function useStdoutDimensions() {
	const { stdout } = useStdout();
	const [dimensions, setDimensions] = useState([stdout.columns, stdout.rows]);

	useEffect(() => {
		const handler = () => {
			setDimensions([process.stdout.columns, process.stdout.rows]);
		};

		process.stdout.on('resize', handler);
		return () => {
			process.stdout.off('resize', handler);
		};
	}, []);

	return dimensions;
}

function App() {
	// const { exit } = useApp(); // technically don't really need this
	const [columns, rows] = useStdoutDimensions();
	// each line is an expression/newline in the text editor
	const [text, setText] = useState(['']);
	const [window, setWindow] = useState({ min:0, max:rows - 2}); // min and max line of the text to show
	// const [out, setOut] = useState('');

	const [cursor, setCursor] = useState({ row: 0, col: 0 });
	const [cursorVisible, setCursorVisible] = useState(true);
	const cursorInterval = 500;
	const cursorChar = '█';

	useEffect(() => {
		const viewHeight = rows - 2; // account for borders

		setWindow(prev => {
			let min = prev.min;
			let max = min + viewHeight;

			// ensure cursor is visible
			if (cursor.row < min) {
				min = cursor.row;
				max = min + viewHeight;
			}

			if (cursor.row >= max) {
				max = cursor.row + 1;
				min = Math.max(0, max - viewHeight);
			}

			return { min, max };
		});
	}, [rows]);

	// cursor blink
	useEffect(() => {
		const timer = setInterval(() => {
			setCursorVisible(v => !v);
		}, cursorInterval);
		return () => clearInterval(timer);
	}, []);

	// input handling
	useInput((input, key) => {
		// uncomment this if using useApp exit. I think just using ctrl C is enough tbh
		// if (key.escape) exit();

		const { row, col } = cursor;

		// enter, create a new line in the array text.
		if (key.return) {
			let newRow = row + 1
			setText(lines => {
				const line = lines[row];
				const before = line.slice(0, col);
				const after = line.slice(col);

				const newLines = [...lines];
				newLines[row] = before;
				newLines.splice(newRow, 0, after);
				return newLines;
			});

			setCursor({ row: newRow, col: 0 });
			if (newRow >= window.max) {
				setWindow(({min, max})=>({
					min: min+1,
					max: max+1
				}))
			}
			return;
		}

		// backspace is delete for some reason
		if (key.delete) {
			// delete char
			if (col > 0) {
				setText(lines => {
					const newLines = [...lines];
					newLines[row] =
						newLines[row].slice(0, col - 1) +
						newLines[row].slice(col);
					return newLines;
				});
				setCursor({ row, col: col - 1 });
				return;
			}

			// merge with previous line
			if (row > 0) {
				setText(lines => {
					const newLines = [...lines];
					const prevLen = newLines[row - 1].length;
					newLines[row - 1] += newLines[row];
					newLines.splice(row, 1);
					setCursor({ row: row - 1, col: prevLen });
					return newLines;
				});
				return;
			}
		}

		// arrow keys
		if (key.leftArrow) {
			if (col > 0) {
				setCursor({ row, col: col - 1 });
			} else if (row > 0) {
				setCursor({
					row: row - 1,
					col: text[row - 1].length
				});
			}
			return;
		}

		if (key.rightArrow) {
			if (col < text[row].length) {
				setCursor({ row, col: col + 1 });
			} else if (row < text.length - 1) {
				setCursor({ row: row + 1, col: 0 });
			}
			return;
		}

		if (key.upArrow) {
			const newRow = row - 1;
			if (newRow >= 0) {
				setCursor({
					row: newRow,
					col: Math.min(col, text[newRow].length)
				});
				if (newRow < window.min) {
					setWindow(({min, max})=>({
						min: min-1,
						max: max-1
					}))
				}
			} else { // go to start of line
				setCursor({
					row: row,
					col: 0
				})
			}
			return;
		}

		if (key.downArrow) {
			const newRow = row + 1;
			if (newRow < text.length) {
				setCursor({
					row: newRow,
					col: Math.min(col, text[newRow].length)
				});
				if (newRow >= window.max) {
					setWindow(({min, max})=>({
						min: min+1,
						max: max+1
					}))
				}
			} else { // go to end of line
				setCursor({
					row: row,
					col: text[row].length
				})
			}
			return;
		}

		// ignore pressing just the control or meta keys
		if (key.ctrl || key.meta) return;
		if (!input) return;

		// write character
		setText(lines => {
			const newLines = [...lines];
			newLines[row] =
				newLines[row].slice(0, col) +
				input +
				newLines[row].slice(col);
			return newLines;
		});

		setCursor({ row, col: col + input.length });
	});

	// render text
	const renderInput = () => {
		return text.slice(window.min, window.max).map((line, i) => {
			if (i + window.min !== cursor.row) return line;

			const before = line.slice(0, cursor.col);
			const currentChar = line[cursor.col] ?? ' ';
			const after = line.slice(cursor.col + 1);

			return (
				before +
				(cursorVisible ? cursorChar : currentChar) +
				after
			);
		}).join('\n');
	};

	// render output
	// note to self, there is probably a more efficient way to compute it. but idk
	// it current recomputes everything. Might find a way to compute only the lines that are changed.
	// Could look into the way Julia (the programming language) does things
	const renderOutput = () => {
		let scope = {} // scope is where all the variables are stored basically.

		// evaluate every line, and append it to the output
		const outputs = text.map((expr) => {
			if (!expr) {
				return ""
			}
			let msg = ""
			try {
				msg = String(evaluate(expr, scope))
			} catch (err) {
				msg = String(err.message)
			}
			// if line too long, truncate it
			msg = msg.replace("\n", " ")
			if (msg.length > columns / 2) {
				msg = msg.slice(0, Math.floor(columns / 2) - 7) + "..."
				// magic number 7. comes from 2 characters from the border, 2 from the other border, 3 for the 3 elipses
			}
			return msg
		})
		return String(outputs.slice(window.min, window.max).join('\n'));
	};

	return (
		<Box flexDirection="row" width={columns} height={rows}>
			<Box borderStyle="round" width="50%" height="100%" paddingX={1}>
				<Text wrap="wrap">
					{renderInput()}
				</Text>
			</Box>

			<Box borderStyle="round" width="50%" height="100%" paddingX={1}>
				<Text wrap="wrap">
					{renderOutput()}
				</Text>
			</Box>
		</Box>
	);
}

render(<App/>);
