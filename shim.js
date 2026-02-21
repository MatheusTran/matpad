// stole this file from: https://github.com/oven-sh/bun/issues/13405#issuecomment-2613782984
// essentially to fix the yoga.wasm file bug when compiling
const bin = Bun.file('bin.js');
let content = await new Response(bin).text();
const pattern = /var Yoga = await initYoga\(await E\(_\(import\.meta\.url\)\.resolve\("\.\/yoga\.wasm"\)\)\);/g;
const replacement = `import initYogaAsm from 'yoga-wasm-web/asm'; const Yoga = initYogaAsm();`;
content = content.replace(pattern, replacement);
await Bun.write('bin.js', content);
