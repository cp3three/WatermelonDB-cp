// 新增：SQLite适配器配置（适配鸿蒙RN）

// examples/src/WatermelonDBSimple/database.js
import { Database } from '@react-native-ohos/watermelondb';
// 替换LokiJSAdapter为SQLiteAdapter
import SQLiteAdapter from '@react-native-ohos/watermelondb/adapters/sqlite';
import schema from './schema';
import { TestItem, TestComment } from './index';

// SQLite适配器配置（适配鸿蒙RN）
const adapter = new SQLiteAdapter({
  schema: schema, // 复用原有schema，无需修改
  dbName: 'watermelon_db_test', // 数据库名称（保持和原LokiJS一致）
  // 鸿蒙RN关键适配配置
  jsi: false, // 鸿蒙RN暂不支持JSI，禁用（必选）
  onSetUpError: (error) => {
    // 捕获SQLite初始化错误（鸿蒙环境常见：权限/路径问题）
    console.error('[SQLite初始化错误]', error.message);
  },
  // 可选：自定义SQLite连接配置（鸿蒙适配）
  sqliteConfig: {
    name: 'watermelon_db_test.db',
    location: 'default', // 鸿蒙默认存储路径
    createFromLocation: 1,
    allowFileUriScheme: true,
  },
});
export const database = new Database({
  adapter,
  modelClasses: [TestItem, TestComment],
  actionsEnabledAtVersion: 1,
});

export default database;


