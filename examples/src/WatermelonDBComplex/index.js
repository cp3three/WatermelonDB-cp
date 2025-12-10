import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Database, Q } from '@react-native-ohos/watermelondb';
import SQLiteAdapter from '@react-native-ohos/watermelondb/adapters/sqlite';
import { DatabaseProvider, useDatabase } from '@react-native-ohos/watermelondb/react';
import { mySchema, migrations } from './models/schema';
import { dbModels } from './models/index.js';
import { SAMPLE_PROJECTS, SAMPLE_TASKS } from './mockdata.js';
import CollectionTestPage from './test/CollectionTestPage'; // 导入测试页面


const adapter = new SQLiteAdapter({
  dbName: 'WatermelonDBComplex', // 数据库名
  schema: mySchema, // 确保 schema 正确导入
  migrations: migrations || [], // 兼容空迁移
  jsi: false, // 禁用 JSI（避免原生依赖问题，优先保证 JS 层运行）
  onSetUpError: (err) => {
    console.error('数据库适配器初始化失败:', err); // 捕获适配器错误
  },
});

// 创建数据库实例并添加日志
export const databaseMain = new Database({
  adapter,
  modelClasses: dbModels, // 确保模型类数组正确
});

// 验证数据库实例是否创建成功
console.log('数据库实例创建结果:', databaseMain); // 检查控制台输出
if (!databaseMain) {
  throw new Error('数据库实例创建失败！');
}


const randomItem = (items) => items[Math.floor(Math.random() * items.length)];


const formatDate = (value) => {
  if (!value) {
    return '未知';
  }
  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
  } catch (error) {
    return '未知';
  }
};

// 按钮组件
const ActionButton = ({ label, onPress, type = 'default' }) => {
  const background =
    type === 'danger'
      ? styles.dangerButton
      : type === 'secondary'
      ? styles.secondaryButton
      : styles.primaryButton;
  return (
    <Pressable
      style={[styles.buttonWrapper, background]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
};

// 项目卡片
const ProjectCard = ({ project, tasksCount, onAddTask, onRename, onDelete }) => {
  const [summary, setSummary] = useState(project.summary);

  useEffect(() => {
    const sub = project.observe().subscribe((updated) => {
      setSummary(updated.summary);
    });
    return () => sub.unsubscribe();
  }, [project]);

  const meta = summary.metadata || {};

  return (
    <View style={styles.card}>
      <Text style={styles.movieTitle}>{summary.name}</Text>
      <Text style={styles.movieMeta}>
        截止日期：{summary.deadline ? formatDate(summary.deadline) : '未设置'}
      </Text>
      <Text style={styles.movieMeta}>
        优先级：{meta.priority || 'medium'} ｜ 标签：
        {(meta.tags || []).join(', ') || '无'}
      </Text>
      <Text style={styles.movieMeta}>任务数：{tasksCount}</Text>
      <View style={styles.cardActions}>
        <ActionButton label="新增任务" onPress={() => onAddTask(project)} />
        <ActionButton label="重命名" type="secondary" onPress={() => onRename(project)} />
        <ActionButton label="删除项目" type="danger" onPress={() => onDelete(project)} />
      </View>
    </View>
  );
};

// 任务行：
const TaskItem = ({ task, onToggleDone, onAddSubtask, onAddNote }) => {
  const [info, setInfo] = useState(task.info);
  const [counts, setCounts] = useState({ subtasks: 0, notes: 0 });

  useEffect(() => {
    const sub = task.observe().subscribe((updated) => {
      setInfo(updated.info);
    });
    return () => sub.unsubscribe();
  }, [task]);

  // 订阅子任务数量
  useEffect(() => {
    const sub = task.subtasks.observe().subscribe((list) => {
      setCounts((prev) => ({ ...prev, subtasks: list.length }));
    });
    return () => sub.unsubscribe();
  }, [task]);

  // 订阅备注数量
  useEffect(() => {
    const notesQuery = task.collections.get('notes').query(Q.where('task_id', task.id));
    const sub = notesQuery.observe().subscribe((list) => {
      setCounts((prev) => ({ ...prev, notes: list.length }));
    });
    return () => sub.unsubscribe();
  }, [task]);

  return (
    <View style={styles.taskContainer}>
      <Pressable style={styles.taskRow} onPress={() => onToggleDone(task)}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.movieDesc, info.isDone && styles.taskDone]}>
            {info.title}
          </Text>
          <Text style={styles.movieMeta}>截止：{formatDate(info.dueDate)}</Text>
          <Text style={styles.movieMeta}>
            子任务：{counts.subtasks} ｜ 备注：{counts.notes}
          </Text>
        </View>
        <Text style={[styles.movieMeta, { marginLeft: 8 }]}>
          {info.isDone ? '已完成' : '未完成'}
        </Text>
      </Pressable>
      <View style={styles.taskActionsRow}>
        <ActionButton label="+子任务" type="secondary" onPress={() => onAddSubtask(task)} />
        <ActionButton label="+备注" type="secondary" onPress={() => onAddNote(task)} />
      </View>
    </View>
  );
};

// 主界面
const ProjectTaskScreen = () => {
  const databaseInstance = useDatabase();
  // Collection，后续所有 CRUD 都通过这里完成
  const projectsCollection = useMemo(
    () => databaseInstance.collections.get('projects'),
    [databaseInstance],
  );
  const tasksCollection = useMemo(
    () => databaseInstance.collections.get('tasks'),
    [databaseInstance],
  );
  const notesCollection = useMemo(
    () => databaseInstance.collections.get('notes'),
    [databaseInstance],
  );
  const subtasksCollection = useMemo(
    () => databaseInstance.collections.get('subtasks'),
    [databaseInstance],
  );

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // 订阅项目列表变化
  useEffect(() => {
    const subscription = projectsCollection.query().observe().subscribe({
      next: (list) => {
        setProjects(list);
        setLoadingProjects(false);
        if (!selectedProject && list.length > 0) {
          setSelectedProject(list[0]);
        }
      },
      error: (error) => console.error('订阅项目列表失败', error),
    });
    return () => subscription.unsubscribe();
  }, [projectsCollection, selectedProject]);

  // 订阅当前选中项目的任务列表
  useEffect(() => {
    if (!selectedProject) {
      setSelectedTasks([]);
      return;
    }
    const query = tasksCollection
      .query(Q.where('project_id', selectedProject.id))
      .extend(Q.sortBy('due_date', Q.desc));
    const sub = query.observe().subscribe({
      next: (list) => setSelectedTasks(list),
      error: (error) => console.error('订阅任务列表失败', error),
    });
    return () => sub.unsubscribe();
  }, [selectedProject, tasksCollection]);

  // 导入示例项目
  const seedDemoData = useCallback(async () => {
    const current = await projectsCollection.query().fetch();
    console.log('%c watermelondbConsoleLogger current:', 'color: #0e93e0;background: #aaefe5;', current);
    if (current.length > 0) {
      Alert.alert('提示', '数据库中已经有项目数据，无需重复导入。');
      return;
    }
    console.log('%c watermelondbConsoleLogger databaseInstance:', 'color: #0e93e0;background: #aaefe5;', databaseInstance);
    await databaseInstance.write(async () => {
      console.log('%c watermelondbConsoleLogger SAMPLE_PROJECTS.length:', 'color: #0e93e0;background: #aaefe5;', SAMPLE_PROJECTS.length);
      for (let i = 0; i < SAMPLE_PROJECTS.length; i += 1) {
        const payload = SAMPLE_PROJECTS[i];
        const project = await projectsCollection.create((record) => {
          record.name = payload.name;
          record.deadline = new Date(Date.now() + i * 3 * 24 * 60 * 60 * 1000);
          record.metadata = {
            priority: payload.priority,
            tags: payload.tags,
          };
        });
        // 为每个项目创建若干任务
        for (let j = 0; j < 3; j += 1) {
          const title = SAMPLE_TASKS[(i * 3 + j) % SAMPLE_TASKS.length];
          await tasksCollection.create((task) => {
            task.title = title;
            task.details = `${payload.name} - ${title}`;
            task.dueDate = new Date(Date.now() + (i + j) * 24 * 60 * 60 * 1000);
            task.isDone = false;
            task.project.set(project);
          });
        }
      }
    });
  }, [databaseInstance, projectsCollection, tasksCollection]);

  // 随机新增项目
  const addRandomProject = useCallback(async () => {
    const payload = randomItem(SAMPLE_PROJECTS);
    await databaseInstance.write(async () => {
      await projectsCollection.create((project) => {
        project.name = `${payload.name} · ${Math.floor(Math.random() * 100)}`;
        project.deadline = new Date();
        project.metadata = {
          priority: payload.priority,
          tags: payload.tags,
        };
      });
    });
  }, [databaseInstance, projectsCollection]);

  // 新增任务
  const addTaskToProject = useCallback(
    async (project) => {
      const title = randomItem(SAMPLE_TASKS);
      await databaseInstance.write(async () => {
        await tasksCollection.create((task) => {
          task.title = title;
          task.details = `${project.name} - ${title}`;
          task.dueDate = new Date();
          task.isDone = false;
          task.project.set(project);
        });
      });
      setSelectedProject(project);
    },
    [databaseInstance, tasksCollection],
  );

  // 重命名
  const renameProject = useCallback(
    async (project) => {
      const base = project.name.split(' · ')[0];
      await project.rename(`${base} · v${Math.floor(Math.random() * 10 + 1)}`);
    },
    [],
  );

  // 删除项目
  const deleteProject = useCallback(
    async (project) => {
      await databaseInstance.write(async () => {
        const projectTasks = await tasksCollection
          .query(Q.where('project_id', project.id))
          .fetch();
        await Promise.all(projectTasks.map((task) => task.destroyPermanently()));
        await project.destroyPermanently();
      });
      if (selectedProject && selectedProject.id === project.id) {
        setSelectedProject(null);
      }
    },
    [databaseInstance, selectedProject, tasksCollection],
  );

  // 切换完成状态
  const toggleTaskDone = useCallback(
    async (task) => {
      await task.toggleDone();
    },
    [],
  );

  // 清空所有
  const clearAll = useCallback(async () => {
    await databaseInstance.write(async () => {
      const allTasks = await tasksCollection.query().fetch();
      const allProjects = await projectsCollection.query().fetch();
      const allNotes = await notesCollection.query().fetch();
      const allSubtasks = await subtasksCollection.query().fetch();
      await Promise.all(allNotes.map((n) => n.destroyPermanently()));
      await Promise.all(allSubtasks.map((s) => s.destroyPermanently()));
      await Promise.all(allTasks.map((t) => t.destroyPermanently()));
      await Promise.all(allProjects.map((p) => p.destroyPermanently()));
    });
    setSelectedProject(null);
  }, [databaseInstance, notesCollection, projectsCollection, subtasksCollection, tasksCollection]);

  // 为任务添加子任务
  const addSubtaskToTask = useCallback(async (task) => {
    await task.addSubtask('子任务 · ' + new Date().toLocaleTimeString());
  }, []);

  // 为任务添加备注
  const addNoteToTask = useCallback(async (task) => {
    await task.addNote('备注于 ' + new Date().toLocaleTimeString());
  }, []);

  const renderProject = ({ item }) => {
    const tasksCount = selectedTasks.filter(
      (t) => selectedProject && t.project.id === item.id,
    ).length;

    return (
      <Pressable onPress={() => setSelectedProject(item)}>
        <ProjectCard
          project={item}
          tasksCount={tasksCount}
          onAddTask={addTaskToProject}
          onRename={renameProject}
          onDelete={deleteProject}
        />
      </Pressable>
    );
  };

   return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>WatermelonDB 项目/任务 Demo</Text>
        <Text style={styles.subtitle}>
          演示 Database / Model / Q / SQLiteAdapter / schemaMigrations / appSchema /
          children / field / text / writer / Associations / Relation / json / date / tableSchema。
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="导入示例项目" onPress={seedDemoData} />
          <ActionButton label="随机新增项目" type="secondary" onPress={addRandomProject} />
          <ActionButton label="清空所有" type="danger" onPress={clearAll} />
        </View>
        <Text style={styles.pageHeader}>WatermelonDB 复杂示例</Text>
        
        {/* 嵌入 Collection API 测试页面 */}
        <CollectionTestPage database={databaseMain}/>
        <Text style={styles.countText}>
          当前共有 {projects.length} 个项目，已选中：
          {selectedProject ? selectedProject.name : '无'}
        </Text>
        {loadingProjects ? (
          <Text style={styles.loadingText}>正在加载项目...</Text>
        ) : projects.length === 0 ? (
          <Text style={styles.loadingText}>暂无项目，请先导入示例数据。</Text>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            renderItem={renderProject}
            scrollEnabled={false}
          />
        )}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.movieTitle}>当前项目任务列表</Text>
          {selectedProject ? (
            selectedTasks.length === 0 ? (
              <Text style={styles.loadingText}>该项目暂无任务。</Text>
            ) : (
              selectedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleDone={toggleTaskDone}
                  onAddSubtask={addSubtaskToTask}
                  onAddNote={addNoteToTask}
                />
              ))
            )
          ) : (
            <Text style={styles.loadingText}>请选择一个项目查看任务。</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default function WatermelonDemo() {
  console.log('%c watermelondbConsoleLogger database:', 'color: #0e93e0;background: #aaefe5;', databaseMain);
  return (
    <DatabaseProvider database={databaseMain}>
      <ProjectTaskScreen />
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b132b',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9f9f9',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#c5c9d3',
    marginBottom: 16,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  countText: {
    color: '#f9f9f9',
    marginBottom: 12,
  },
  loadingText: {
    color: '#c5c9d3',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#1c2541',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  movieGenre: {
    color: '#5bc0be',
    marginTop: 4,
  },
  movieDesc: {
    color: '#d1d5db',
    marginTop: 8,
    lineHeight: 18,
  },
  movieMeta: {
    color: '#9aa0ac',
    marginTop: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3a506b',
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  reviewItem: {
    color: '#c5c9d3',
    marginTop: 4,
  },
  taskContainer: {
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  buttonWrapper: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  primaryButton: {
    backgroundColor: '#5bc0be',
  },
  secondaryButton: {
    backgroundColor: '#3a506b',
  },
  dangerButton: {
    backgroundColor: '#ef476f',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  taskActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
});
