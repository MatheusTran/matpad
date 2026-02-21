import { useEffect, useState, useContext, createContext } from "react";
import { useStdout, useInput, useApp } from "ink";


const context = createContext()

export function useData(){
    return useContext(context)
}

export function DataContext(props) {
	const { exit } = useApp();
	const [columns, rows] = useStdoutDimensions();
	// each line is an expression/newline in the text editor
	const [text, setText] = useState(['']);
	const [window, setWindow] = useState({ min:0, max:rows - 2, height:rows - 2}); // min and max line of the text to show
	// const [out, setOut] = useState('');

	const [cursor, setCursor] = useState({ row: 0, col: 0 });
	const [cursorVisible, setCursorVisible] = useState(true);
	const cursorInterval = 500;
	const cursorChar = '█';

	// update view window when updating terminal size
	useEffect(() => {
		const height = rows - 2; // account for borders

		setWindow(prev => {
			let min = prev.min;
			let max = min + height;

			// ensure cursor is visible
			if (cursor.row < min) {
				min = cursor.row;
				max = min + height;
			}

			if (cursor.row >= max) {
				max = cursor.row + 1;
				min = Math.max(0, max - height);
			}

			return { min, max, height };
		});
	}, [rows, cursor.row]);

	// cursor blink
	useEffect(() => {
		const timer = setInterval(() => {
			setCursorVisible(v => !v);
		}, cursorInterval);
		return () => clearInterval(timer);
	}, []);

	// input handling
	useInput((input, key) => {
		if (key.escape) exit();

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

		if (key.pageUp) {
			if (row > window.min) {
				const newRow = Math.max(0, window.min)
				setCursor({
					row: newRow,
					col: col < text[newRow].length ? col : text[newRow].length
				})
			} else {
				setCursor({
					row: Math.max(window.min - window.height, 0),
					col
				})
			}
		}

		if (key.pageDown) {
			if (row < window.max - 1) {
				const newRow = Math.min(text.length, window.max) - 1
				setCursor({
					row: newRow,
					col: col < text[newRow].length ? col : text[newRow].length
				})
			} else {
				setCursor({
					row: Math.min(window.max + window.height, text.length) - 1,
					col
				})
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
			} else { // go to end of line
				setCursor({
					row: row,
					col: text[row].length
				})
			}
			return;
		}

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

	const allData = {
		columns,
		rows,
		text,
		window,
		cursor,
		cursorVisible,
		cursorChar
    }

    return (
        <context.Provider value={allData}>
            {props.children}
        </context.Provider>
    )

}

// resize window. Stole it from someone online
export function useStdoutDimensions() {
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

