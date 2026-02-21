import React from 'react'; // idk why but we need this here for builds
// import "./yoga.wasm" with { type: "file" };
import { useState, useEffect } from 'react';
import { Text, Box, useInput, useStdout, render } from 'ink';
import { evaluate } from 'mathjs';

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
	const [cursor, setCursor] = useState({ row: 0, col: 0 });
	// const [out, setOut] = useState('');

	const [cursorVisible, setCursorVisible] = useState(true);
	const cursorInterval = 500;
	const cursorChar = '█';

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
			setText(lines => {
				const line = lines[row];
				const before = line.slice(0, col);
				const after = line.slice(col);

				const newLines = [...lines];
				newLines[row] = before;
				newLines.splice(row + 1, 0, after);
				return newLines;
			});

			setCursor({ row: row + 1, col: 0 });
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
			if (row > 0) {
				const newRow = row - 1;
				setCursor({
					row: newRow,
					col: Math.min(col, text[newRow].length)
				});
			}
			return;
		}

		if (key.downArrow) {
			if (row < text.length - 1) {
				const newRow = row + 1;
				setCursor({
					row: newRow,
					col: Math.min(col, text[newRow].length)
				});
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
		return text.map((line, i) => {
			if (i !== cursor.row) return line;

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
		return String(outputs.join('\n'));
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
