# The Hit List Exporter

## Install

You can either install using `npm i -g thl-export` and run it using the `thl-export` command.

Or you can run it directly from within a cloned copy of this repo.

1. First install [Node.js](https://nodejs.org/) with your favorite package manager
2. Clone this repo
3. Run `npm install` inside of it

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

## License

`AGPL-3.0`.

## History

- `0.0.1` - Initial release.
