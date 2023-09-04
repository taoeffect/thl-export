# The Hit List Exporter

A tool to export your hit lists from Andy Kim's [The Hit List](https://www.karelia.com/products/the-hit-list/mac.html) todo list app. Supports both JSON and Markdown export.

```
Usage:
  thl-export [-m] <thl-sqlitepath> <folder>

  -m --markdown  outputs markdown files instead of json files
```

## Install

If you have NPM installed, install using `npm i -g thl-export` and run it using the `thl-export` command.

You can also run it directly from within a cloned copy of this repo.

1. First install [Node.js](https://nodejs.org/) with your favorite package manager
2. Clone this repo
3. Run `npm install` inside of it
4. Run using `node index.mjs`

## Running the export

You need the file `The Hit List Library.thllibrary`. And specifically you need the file `library.sqlite3` inside of it.

1. Navigate to `~/Library/Application Support/The Hit List`
2. Right-click or Ctrl-click on `The Hit List Library.thllibrary` and choose "Show Package Contents"
3. Inside of there you'll see the file `library.sqlite3`

Now you can export all of your lists:

```
$ thl-export ~/Library/Application\ Support/The\ Hit\ List/The\ Hit\ List\ Library.thllibrary/library.sqlite3 export

## or from within this cloned repo
$ node index.mjs ~/Library/Application\ Support/The\ Hit\ List/The\ Hit\ List\ Library.thllibrary/library.sqlite3 export
```

This will create a directory called `export` and save everything into `.json` files inside of that folder.

It:

- Preserves your heirarchy of folders
- Preserves your heirarchy of tasks, as well as the notes inside of them

Attachments are not exported. (Feel free to send PRs if you want that).

You can view and manipulate the JSON files using the [`jq`](https://jqlang.github.io/jq/) command.

### Markdown support

You can also export as markdown files by using the `-m` flag.

```
$ thl-export -m ~/Library/Application\ Support/The\ Hit\ List/The\ Hit\ List\ Library.thllibrary/library.sqlite3 export
```

## License

`AGPL-3.0`.

## History

- `1.1.1` - Don't include `<details>` if note contains `<` symbol.
- `1.1.0` - Hide notes using `<details>` in markdown files.
- `1.0.1` - Replace `$` with `\$` in tasks in markdown files for proper rendering.
- `1.0.0` - Added markdown support via `-m`.
- `0.0.2` - Attempt at fixing npm tool install.
- `0.0.1` - Initial release.
