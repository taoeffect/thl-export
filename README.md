# The Hit List Exporter

A tool to export your hit lists from Andy Kim's [The Hit List](https://www.karelia.com/products/the-hit-list/mac.html) todo list app. Supports both JSON and Markdown export.

```
Usage:
  thl-export [-m] <thl-sqlitepath> <folder>

  -m --markdown  outputs markdown files instead of json files
```

## Install

If you have NPM installed, the preferred way is to install using:

1. `npm i -g thl-export`

And then run the `thl-export` command according to the **Usage** instructions below.

You can also run the command from the source code of this project by cloning this repo and using these instructions instead:

1. First install [Node.js](https://nodejs.org/) with your favorite package manager
2. Clone this repo
3. Run `npm install` inside of it
4. Run using `node index.mjs` (instead of using `thl-export`)

## Usage

The Hit List stores its library inside of a file called either `The Hit List.thllibrary` or `The Hit List Library.thllibrary`.

This file is typically stored here:

```
/Users/[your username]/Library/Application Support/The Hit List
```

When you find that file, right-click on it and choose **Show Package Contents**. Inside of the folder that appears will be a file called `library.sqlite3`. This is the file that we want.

You can drag this file onto a Terminal window to get its filepath and also to pass it in as the first argument to the `thl-export` command.

Here's an example of how to export our library as JSON (assuming we found it inside of a file called `The Hit List.thllibrary`):

```
$ thl-export ~/Library/Application\ Support/The\ Hit\ List/The\ Hit\ List.thllibrary/library.sqlite3 export
```

And here's an example for how to export using [Markdown](https://en.wikipedia.org/wiki/Markdown) instead of JSON:

```
$ thl-export -m ~/Library/Application\ Support/The\ Hit\ List/The\ Hit\ List.thllibrary/library.sqlite3 export
```

This will create a directory called `export` in the current directory, and save all your lists into that folder while making sure to:

- Preserve your hierarchy of folders
- Preserve your hierarchy of tasks, as well as the notes inside of them

Exporting attached files is not exported. (Feel free to send PRs).

You can view and manipulate the JSON files using the [`jq`](https://jqlang.github.io/jq/) command.

## License

`AGPL-3.0`.

## History

- `1.1.1` - Don't include `<details>` if note contains `<` symbol.
- `1.1.0` - Hide notes using `<details>` in markdown files.
- `1.0.1` - Replace `$` with `\$` in tasks in markdown files for proper rendering.
- `1.0.0` - Added markdown support via `-m`.
- `0.0.2` - Attempt at fixing npm tool install.
- `0.0.1` - Initial release.
