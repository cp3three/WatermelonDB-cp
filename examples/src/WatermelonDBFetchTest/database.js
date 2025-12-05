import { Database } from '@react-native-ohos/watermelondb';
import SQLiteAdapter from '@react-native-ohos/watermelondb/adapters/sqlite';
import { schema } from './schema';
import Article from './model'; // 导入数据模型类

// 初始化数据库（添加 modelClasses 配置）
export const database = new Database({
  adapter: new SQLiteAdapter({
    dbName: 'WatermelonFetchTest',
    schema,
  }),
  modelClasses: [Article], // 必须配置：指定数据库模型类
});

// database.js 中的 seedTestData 函数（标准实现）
export const seedTestData = async () => {
  if (!database) return;

  // 先清空现有数据（避免重复ID冲突）
  await database.write(async () => {
    const allArticles = await database.collections.get('articles').query().fetch();
    for (const article of allArticles) {
      await article.destroyPermanently();
    }
  });

  // 创建测试数据（所有字段赋值在 create 回调内）
  await database.write(async () => {
    const articlesCollection = database.collections.get('articles');
    
    // 测试数据1
    await articlesCollection.create(article => {
      article.title = '鸿蒙开发实战';
      article.author = '测试作者1';
      article.content = 'WatermelonDB 鸿蒙版测试内容';
      article.publishDate = Date.now();
      article.isFeatured = true;
    });

    // 测试数据2
    await articlesCollection.create(article => {
      article.title = 'React Native 跨平台';
      article.author = '测试作者2';
      // 不设置 content，验证默认值
      article.publishDate = Date.now() - 10 * 24 * 60 * 60 * 1000;
      article.isFeatured = false;
    });

    // 测试数据3
    await articlesCollection.create(article => {
      article.title = '30天前的旧文章';
      article.author = '测试作者3';
      article.content = '旧文章测试内容';
      article.publishDate = Date.now() - 35 * 24 * 60 * 60 * 1000;
      article.isFeatured = false;
    });
  });

  console.log('[seedTestData] 测试数据创建完成（共3条）');
};

// 导出数据库 Provider 所需的实例（适配鸿蒙版 useDatabase）
export const getDatabase = () => database;