#!/usr/bin/env bun

import { evaluate } from 'mathjs';
import { createInterface } from 'node:readline';
// const math = require('mathjs');
// const readline = require('readline');

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    historySize: 1000,
    terminal: true
})

const colors = {
  // Text colors
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    magenta: (text) => `\x1b[35m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    white: (text) => `\x1b[37m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`,

    // Text styles
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
    dim: (text) => `\x1b[2m${text}\x1b[0m`,
    italic: (text) => `\x1b[3m${text}\x1b[0m`,
    underline: (text) => `\x1b[4m${text}\x1b[0m`,

    // Background colors
    bgRed: (text) => `\x1b[41m${text}\x1b[0m`,
    bgGreen: (text) => `\x1b[42m${text}\x1b[0m`,
    bgYellow: (text) => `\x1b[43m${text}\x1b[0m`,
    bgBlue: (text) => `\x1b[44m${text}\x1b[0m`,
};


let inp = []
let out = []
const scope = {ans:0, count:1, inp, out}

function sanitize(s) {
    return s.trim()
}

function prompt() {
    // seperation bars
    let cols = process.stdout.columns //counts the columns for seperation bars
    console.log(`+${'-'.repeat(cols - 4)}+`)

    // get prompt from user
    rl.question(colors.blue(`inp[${scope.count}]:`), (line) => {
        // current sanitation doesn't do anything. might add features in the future
        const input = sanitize(line)
        // append input to list
        inp[scope.count - 1] = input

        try {
            // evaluate input
            const result = evaluate(input, scope)

            // record results
            // scope[`\$${scope.count}`] = result
            out[scope.count - 1] = result
            scope.ans = result // previous result

            // print out the results
            console.log(colors.cyan(`out[${scope.count}]: `) + result)
        } catch (err) {
            // print error messages
            console.log(colors.red(`Error: ${err.message}`))
            out[scope.count - 1] = 'err' // append "err" so that the output array doesn't go out of whack
        }

        // increment counter
        scope.count++
        prompt()
    })
}
prompt()
