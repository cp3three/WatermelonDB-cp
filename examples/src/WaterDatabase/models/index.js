
import { Model } from '@react-native-ohos/watermelondb';
import { field, text, date, readonly, relation } from '@react-native-ohos/watermelondb/decorators';

// 主测试模型
export class TestItem extends Model {
  static table = 'test_items';

  @text('name') name;
  @field('value') value;
  @field('is_active') isActive;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}

// 关联测试模型（用于 batch 和关系测试）
export class TestComment extends Model {
  static table = 'test_comments';
  static associations = { test_items: { type: 'belongs_to', key: 'item_id' } };

  @relation('test_items', 'item_id') item;
  @text('content') content;
}