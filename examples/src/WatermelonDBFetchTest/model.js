// model.js（最终修复版）
import { Model } from '@react-native-ohos/watermelondb';
import { field } from '@react-native-ohos/watermelondb/decorators';

// 1. 修复 Article 模型：移除构造函数的字段修改，改用 getter 提供默认值
export default class Article extends Model {
  static table = 'articles';

  // 定义字段（仅声明，不修改）
  @field('title') title;
  @field('content') content;
  @field('author') author;
  @field('publish_date') publishDate;
  @field('is_featured') isFeatured;

  // 构造函数：仅保留日志，不修改任何字段
  constructor(...args) {
    super(...args);
    console.log(`[Constructor测试] Article实例创建，ID: ${this.id || '未生成'}`);
  }

  // 🔥 关键修复：用 getter 提供 content 默认值（不修改原始记录）
  get contentWithDefault() {
    return this.content || '构造函数默认内容：暂无正文';
  }

  // 自定义方法：包含 ID 的摘要（适配默认值）
  getSummaryWithId() {
    return `${this.id} - ${this.title}（作者：${this.author}）`;
  }
}

// 2. 扩展模型（ES6 类继承，兼容鸿蒙版）
export class FeaturedArticle extends Article {
  // 扩展方法：仅返回精选文章的摘要（适配默认值）
  getFeaturedSummary() {
    return `【精选】${this.title} - ${this.contentWithDefault.substring(0, 20)}...`;
  }

  // 扩展属性：计算是否为最新精选文章
  get isRecentFeatured() {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return this.isFeatured && this.publishDate > thirtyDaysAgo;
  }

  // 兼容：从普通 Article 实例转换为 FeaturedArticle 实例
  static fromArticle(article) {
    const featuredArticle = new FeaturedArticle(article._raw, article.database);
    Object.assign(featuredArticle, article);
    return featuredArticle;
  }
}