
import { appSchema, tableSchema } from '@react-native-ohos/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'test_items',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'value', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'test_comments',
      columns: [
        { name: 'item_id', type: 'string', isIndexed: true },
        { name: 'content', type: 'string' },
      ]
    })
  ]
});