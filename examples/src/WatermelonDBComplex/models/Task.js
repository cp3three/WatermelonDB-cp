import { Model } from '@react-native-ohos/watermelondb'
import {
  children,
  date,
  field,
  relation,
  text,
  writer,
} from '@react-native-ohos/watermelondb/decorators'

export default class Task extends Model {
  static table = 'tasks'

  static associations = {
    projects: { type: 'belongs_to', key: 'project_id' },
    subtasks: { type: 'has_many', foreignKey: 'task_id' },
    notes: { type: 'has_many', foreignKey: 'task_id' },
  }

  @field('title') title
  @text('details') details
  @date('due_date') dueDate
  @field('is_done') isDone
  @relation('projects', 'project_id') project
  @children('subtasks') subtasks

  get info() {
    return {
      id: this.id,
      title: this.title,
      dueDate: this.dueDate,
      isDone: this.isDone,
    }
  }

  @writer async toggleDone() {
    await this.update((task) => {
      task.isDone = !task.isDone
    })
  }

  @writer async rename(nextTitle) {
    await this.update((task) => {
      task.title = nextTitle
    })
  }

  @writer async updateDetails(nextDetails) {
    await this.update((task) => {
      task.details = nextDetails
    })
  }

  @writer async addNote(body) {
    await this.collections.get('notes').create((note) => {
      note.task.set(this)
      note.body = body
    })
  }

  @writer async addSubtask(title) {
    await this.collections.get('subtasks').create((subtask) => {
      subtask.task.set(this)
      subtask.title = title
    })
  }
}

