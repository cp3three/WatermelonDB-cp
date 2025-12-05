// schema.js
import { appSchema, tableSchema } from '@react-native-ohos/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'articles',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'author', type: 'string' },
        { name: 'publish_date', type: 'number' }, // 注意：鸿蒙版字段名用下划线
        { name: 'is_featured', type: 'boolean' },
      ],
    }),
  ],
});