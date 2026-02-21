import { render } from "ink";
import { App } from "./App";
import { DataContext } from "./hooks";

render(
<DataContext>
	<App/>
</DataContext>
);
