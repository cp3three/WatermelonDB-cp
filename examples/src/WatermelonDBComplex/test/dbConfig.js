// 导入主应用的数据库实例
import { databaseMain } from '../index';
import Project from '../models/Project';
import Task from '../models/Task';

// 导出测试用的集合
export const projectsCollection = databaseMain.collections?.get('projects');
export const tasksCollection = databaseMain.collections?.get('tasks');

// 导出数据库实例和模型（供测试逻辑使用）
export const database = databaseMain;
export const testModels = { Project, Task };