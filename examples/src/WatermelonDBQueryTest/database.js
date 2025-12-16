import { Database } from '@react-native-ohos/watermelondb';
import SQLiteAdapter from '@react-native-ohos/watermelondb/adapters/sqlite';
import { schema } from './schema';
import Article from './model'; // 导入数据模型类
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// 初始化数据库（添加 modelClasses 配置）
export const database = new Database({
  adapter: new SQLiteAdapter({
    dbName: 'WatermelonFetchTest',
    schema,
    jsi: false,
    migrations: schemaMigrations({ migrations: [] }),
  }),
  modelClasses: [Article], // 必须配置：指定数据库模型类
});

// database.js 中的 seedTestData 函数（标准实现）
export const seedTestData = async () => {
  if (!database) return;

  // 先清空现有数据（避免重复ID冲突）
  await database.write(async () => {
    const allArticles = await database.collections
      .get('articles')
      .query()
      .fetch();
    for (const article of allArticles) {
      await article.destroyPermanently();
    }
  });

  // 创建测试数据（所有字段赋值在 create 回调内）
  await database.write(async () => {
    const articlesCollection = database.collections.get('articles');
  });

  console.log('[seedTestData] 测试数据创建完成（共3条）');
};

// 导出数据库 Provider 所需的实例（适配鸿蒙版 useDatabase）
export const getDatabase = () => database;
