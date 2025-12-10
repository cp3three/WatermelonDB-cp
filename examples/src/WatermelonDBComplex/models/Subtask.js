import { Model } from '@react-native-ohos/watermelondb'
import { field, json, relation, writer } from '@react-native-ohos/watermelondb/decorators'

const extraSanitizer = (value) => {
  if (!value) {
    return { effort: 1, tags: [] }
  }
  return value
}

export default class Subtask extends Model {
  static table = 'subtasks'

  static associations = {
    tasks: { type: 'belongs_to', key: 'task_id' },
  }

  @field('title') title
  @json('extra', extraSanitizer) extra
  @relation('tasks', 'task_id') task

  @writer async updateExtra(updater) {
    await this.update((record) => {
      const current = record.extra || { effort: 1, tags: [] }
      record.extra = typeof updater === 'function' ? updater(current) : updater
    })
  }
}

