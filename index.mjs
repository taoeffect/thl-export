#!/usr/bin/env node

'use strict'

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, sep } from 'node:path'
import sqlite3 from 'sqlite3'
import { jack } from 'jackspeak'

const j = jack({
  usage: 'thl-export [-m] <thl-sqlitepath> <folder>'
}).flag({
  markdown: { short: 'm', description: "outputs markdown files instead of json files." }
})

const { values: flags, positionals } = j.parse()
if (positionals.length !== 2) {
  console.log(j.usage())
  process.exit(1)
}
const [dbPath, parentFolder] = positionals

const findToplevelTasks = `
  SELECT 
    ZTASK.Z_PK AS 'Id',
    ZTASK.ZPRIORITY AS 'Priority',
    ZTASK.ZSTATUS AS 'Status',
    ZTASK.ZTITLE AS 'Task',
    ZTASKNOTES.ZSTRING AS 'Notes',  
    datetime(ZTASK.ZCREATEDDATE + 978260000.0, 'unixepoch') AS 'Date',
    ZTASK.ZCREATEDDATE AS 'OriginalCreatedDate'
  FROM     
    ZTASK
    LEFT JOIN ZTASKNOTES ON ZTASK.ZNOTES = ZTASKNOTES.Z_PK
    INNER JOIN ZGROUP ON ZTASK.ZPARENTLIST = ZGROUP.Z_PK
  WHERE
    ZGROUP.Z_PK = ?
  ORDER BY
    ZTASK.ZDISPLAYORDER ASC  
`

const findChildTasks = `
SELECT
  ZTASK.Z_PK AS 'Id',
  ZTASK.ZPRIORITY AS 'Priority',
  ZTASK.ZSTATUS AS 'Status',
  ZTASK.ZTITLE AS 'Task',
  ZTASKNOTES.ZSTRING AS 'Notes',
  datetime(ZTASK.ZCREATEDDATE + 978220000.0, 'unixepoch') AS 'Date', 
  ZTASK.ZCREATEDDATE AS 'OriginalCreatedDate',
  ZTASK.ZPARENTTASK AS 'ParentId'
FROM
  ZTASK LEFT JOIN ZTASKNOTES ON ZTASK.ZNOTES = ZTASKNOTES.Z_PK
WHERE
  ZTASK.ZPARENTLIST IS NULL AND ZTASK.ZPARENTTASK = ?
ORDER BY
  ZTASK.ZDISPLAYORDER ASC
`

async function topFolderId () {
  const [{ Z_PK }] = await dbQuery(`SELECT Z_PK FROM ZGROUP WHERE ZPARENTGROUP IS NULL`)
  const result = await dbQuery(`SELECT Z_PK FROM ZGROUP WHERE ZPARENTGROUP = ? AND ZTITLE = 'Folders'`, [Z_PK])
  if (result?.length === 0) throw Error("Couldn't find top-level folder... maybe it's localized to something else?")
  return result[0].Z_PK
}

async function foldersInsideOf (folderId) {
  return await dbQuery(`SELECT Z_PK, ZTITLE FROM  "ZGROUP" WHERE ZPARENTGROUP = ? AND ZTYPE = 'folder' ORDER BY "ZDISPLAYORDER"`, [folderId])
}

async function groupsInsideOf (folderId) {
  return await dbQuery(`SELECT Z_PK, ZTITLE, ZTYPE FROM  "ZGROUP" WHERE ZPARENTGROUP = ? AND (ZTYPE = 'folder' OR ZTYPE = 'list') ORDER BY "ZDISPLAYORDER"`, [folderId])
}

function findTask (rows, id) {
  for (const row of rows) {
    if (row.Id === id) return row
    if (row.children) {
      const child = findTask(row.children, id)
      if (child) return child
    }
  }
}

function printTask (indent, row) {
  const task = row.Task.split('\n').map((x, i) => {
    return '  '.repeat((i === 0 ? 0 : 1) * (indent + 1)) + x
  }).join('\n')
  let str = '  '.repeat(indent) + `- [ ] ${task}`
  if (row.Notes) {
    str += '\n\n'
    str += '  '.repeat(indent + 1) + '```\n'
    str += row.Notes.split('\n').map(x => {
      return '  '.repeat(indent + 1) + x
    }).join('\n')
    str += '\n' + '  '.repeat(indent + 1) + '```\n\n'
  } else {
    str += '\n'
  }
  if (row.children) {
    for (const child of row.children) {
      str += printTask(indent + 1, child)
    }
  }
  return str
}

function markdownify (listName, rows) {
  let str = `# ${listName}` + '\n\n'
  for (const row of rows) {
    if (!row.Status) {
      str += printTask(0, row)
    }
  }
  str += '\n'
  return str
}

async function saveListsInsideOf (parentPath, topFolder) {
  console.log('Saving lists inside of', parentPath, '...')
  await mkdir(parentPath, { recursive: true })
  const groups = await groupsInsideOf(topFolder.Z_PK)
  for (const group of groups) {
    if (group.ZTYPE === 'folder') {
      await saveListsInsideOf(join(parentPath, group.ZTITLE), group)
    } else {
      const safeListName = group.ZTITLE.replaceAll(sep, '|').replaceAll(':', '-')
      const filePath = `${join(parentPath, safeListName)}.${flags.markdown ? 'md' : 'json'}`
      console.log('Exporting', filePath, '...')
      const allRows = await dbQuery(findToplevelTasks, [group.Z_PK])
      for (const row of allRows) {
        await fillParentWithChildren(allRows, row.Id)
      }
      try {
        if (flags.markdown) {
          await writeFile(filePath, markdownify(group.ZTITLE, allRows))
        } else {
          await writeFile(filePath, JSON.stringify(allRows, null, 2))
        }
      } catch (e) {
        console.error("[ERROR] couldn't save '", filePath, "'! Error:", e)
      }
    }
  }
}

async function childrenOf (parentId) {
  const children = await dbQuery(findChildTasks, [parentId])
  return children?.length > 0 ? children  : []
}

async function fillParentWithChildren (rows, parentId) {
  const parent = findTask(rows, parentId)
  const children = await childrenOf(parentId)
  if (children.length && !parent.children) parent.children = []
  for (const child of children) {
    parent.children.push(child)
    await fillParentWithChildren(parent.children, child.Id)
  }
}

function dbQuery (query, params) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      err ? reject(err) : resolve(rows)
    })
  })
}

var db
;(async function () {
  try {
    db = new sqlite3.Database(dbPath) 
    if (existsSync(parentFolder)) {
      console.error('folder already exists:', parentFolder)
    } else {
      const topFolders = await foldersInsideOf(await topFolderId())
      await mkdir(parentFolder, { recursive: true })
      for (const folder of topFolders) {
        await saveListsInsideOf(join(parentFolder, folder.ZTITLE), folder)
      }
    }
    db.close()
    process.exit(0)
  } catch (e) {
    console.error(e)
    db.close()
    process.exit(1)
  }
})()

