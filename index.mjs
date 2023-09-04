#!/usr/bin/env node

'use strict'

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, sep } from 'node:path'
import sqlite3 from 'sqlite3'

const dbPath = process.argv[2]
const parentFolder = process.argv[3]

const findToplevelTasks = `
  SELECT 
    ZTASK.Z_PK AS 'Id',
    ZTASK.ZPRIORITY AS 'Priority',
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

async function saveListsInsideOf (parentPath, topFolder) {
  console.log('Saving lists inside of', parentPath, '...')
  await mkdir(parentPath, { recursive: true })
  const groups = await groupsInsideOf(topFolder.Z_PK)
  for (const group of groups) {
    if (group.ZTYPE === 'folder') {
      await saveListsInsideOf(join(parentPath, group.ZTITLE), group)
    } else {
      const safeListName = group.ZTITLE.replaceAll(sep, '|').replaceAll(':', '-')
      const jsonPath = `${join(parentPath, safeListName)}.json`
      console.log('Exporting', jsonPath, '...')
      const allRows = await dbQuery(findToplevelTasks, [group.Z_PK])
      for (const row of allRows) {
        await fillParentWithChildren(allRows, row.Id)
      }
      try {
        await writeFile(jsonPath, JSON.stringify(allRows, null, 2))
      } catch (e) {
        console.error("[ERROR] couldn't save '", jsonPath, "'! Error:", e)
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

function printHelp () {
  console.log(`USAGE:
  
  node index.mjs "<path/to/The Hit List Library.thllibrary/library.sqlite3>" "<exportFolder>"`)
}
var db
;(async function () {
  try {
    if (!dbPath || !parentFolder) {
      printHelp()
      process.exit(1)
    }
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

