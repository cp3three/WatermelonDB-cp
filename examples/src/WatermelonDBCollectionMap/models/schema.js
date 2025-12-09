import { appSchema, tableSchema } from "@react-native-ohos/watermelondb";

export const mockDatabaseSchema = appSchema({
  // Schema 版本号（WatermelonDB 必选，默认填 1 即可）
  version: 1,
  // 表定义数组（对应 mockDatabase 中 tables 里的 key）
  tables: [
    // 对应 mock_projects 表
    tableSchema({
      name: 'mock_projects',
      columns: [
        // 示例字段1：内容字段（字符串类型）
        { name: 'body', type: 'string' },
        { name: 'task_id', type: 'string', isIndexed: true },
      ]
    }),
    // 对应 mock_tasks 表
    tableSchema({
      name: 'mock_tasks',
      columns: [
        // 示例字段1：任务名称（字符串类型）
        { name: 'name', type: 'string' },
        // 示例字段2：完成状态（布尔类型）
        { name: 'is_completed', type: 'boolean' },
      ]
    })
  ]
});
