import { Text, Box } from 'ink';
import { evaluate } from 'mathjs';
import { useData } from './hooks';

export function App() {
	const {
		columns,
		rows,
		text,
		window,
		cursor,
		cursorVisible,
		cursorChar
    } = useData()
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
		// return `${cursor.row}, ${cursor.col}. height = ${window.height}`
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
