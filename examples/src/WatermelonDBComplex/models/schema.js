import { appSchema, tableSchema } from '@react-native-ohos/watermelondb'
import {
  createTable,
  schemaMigrations,
} from '@react-native-ohos/watermelondb/Schema/migrations'

export const mySchema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'projects',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'deadline', type: 'number', isOptional: true },
        { name: 'metadata', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'details', type: 'string', isOptional: true },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'is_done', type: 'boolean' },
        { name: 'project_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'subtasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'extra', type: 'string', isOptional: true },
        { name: 'task_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'notes',
      columns: [
        { name: 'body', type: 'string' },
        { name: 'task_id', type: 'string', isIndexed: true },
      ],
    }),
  ],
})

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'notes',
          columns: [
            { name: 'body', type: 'string' },
            { name: 'task_id', type: 'string', isIndexed: true },
          ],
        }),
      ],
    },
  ],
})
