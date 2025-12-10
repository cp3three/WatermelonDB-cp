import { Model } from '@react-native-ohos/watermelondb'
import { children, date, json, text, writer } from '@react-native-ohos/watermelondb/decorators'


const metadataSanitizer = (value) => {
  if (!value) {
    return { priority: 'medium', tags: [] }
  }
  return value
}

export default class Project extends Model {
  static table = 'projects'

  static associations = {
    tasks: { type: 'has_many', foreignKey: 'project_id' },
  }

  @text('name') name
  @date('deadline') deadline
  @json('metadata', metadataSanitizer) metadata
  @children('tasks') tasks

  get summary() {
    return {
      id: this.id,
      name: this.name,
      deadline: this.deadline,
      metadata: this.metadata,
    }
  }

  @writer async rename(newName) {
    await this.update((project) => {
      project.name = newName
    })
  }

  @writer async updateMetadata(updater) {
    await this.update((project) => {
      const current = project.metadata || { priority: 'medium', tags: [] }
      project.metadata = typeof updater === 'function' ? updater(current) : updater
    })
  }
}

