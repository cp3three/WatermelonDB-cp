// ObserveMethodTest.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { database } from './database'; // 导入现有数据库

export default function ObserveMethodTest() {
  // 状态管理
  const [status, setStatus] = useState('准备就绪');
  const [events, setEvents] = useState([]);
  const [observedItems, setObservedItems] = useState([]);
  const subscriptionRef = useRef(null);
  const testItemId = useRef(null);
  // 新增：observeWithColumns 相关状态和引用
  const [observedColumns, setObservedColumns] = useState([]);
  const columnsSubscriptionRef = useRef(null);
  const [selectedColumns, setSelectedColumns] = useState(['title', 'author']);

  // 新增：observeCount 相关状态和引用
  const [itemCount, setItemCount] = useState(0);
  const countSubscriptionRef = useRef(null);
  const [countFilter, setCountFilter] = useState('all'); // 'all' 或 'featured'

  // 获取集合引用
  const getArticlesCollection = () => {
    return database?.collections?.get('articles') || null;
  };

  // 添加事件日志
  const addEvent = (type, message) => {
    const newEvent = {
      id: Date.now(),
      type, // 'info', 'success', 'error', 'update'
      message,
      timestamp: new Date().toLocaleString(),
    };

    // 只保留最近20条事件
    setEvents(prev => [newEvent, ...prev.slice(0, 19)]);
  };

  // 开始观察
  const startObserving = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) {
        throw new Error('无法获取articles集合');
      }

      // 取消之前的订阅
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      setStatus('正在观察数据变化...');
      addEvent('info', '开始观察articles集合的所有数据变化');

      // 创建查询并观察
      const query = collection.query();
      subscriptionRef.current = query.observe().subscribe({
        next: items => {
          setObservedItems(items);
          addEvent('update', `数据更新: 共${items.length}条记录`);
          setStatus(`最后更新: ${new Date().toLocaleTimeString()}`);
        },
        error: error => {
          addEvent('error', `观察出错: ${error.message}`);
          setStatus('观察出错');
          console.error('观察错误:', error);
        },
        complete: () => {
          addEvent('info', '观察已完成');
          setStatus('观察已完成');
        },
      });

      // 创建一个测试项目
      await database.write(async () => {
        const newItem = await collection.create(item => {
          item.title = 'Observe测试项目';
          item.author = '测试脚本';
          item.publishDate = Date.now();
          item.isFeatured = false;
        });
        testItemId.current = newItem.id;
        addEvent('success', `已创建测试项目，ID: ${newItem.id}`);
      });
    } catch (error) {
      addEvent('error', `启动观察失败: ${error.message}`);
      setStatus('启动观察失败');
    }
  };

  // 停止观察
  const stopObserving = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
      setStatus('已停止观察');
      addEvent('info', '已停止观察数据变化');
    }
  };

  // 更新测试项目
  const updateTestItem = async () => {
    try {
      if (!testItemId.current) {
        Alert.alert('提示', '请先开始观察以创建测试项目');
        return;
      }

      const collection = getArticlesCollection();
      if (!collection) {
        throw new Error('无法获取articles集合');
      }

      await database.write(async () => {
        const item = await collection.find(testItemId.current);
        await item.update(updated => {
          updated.title = `Observe测试项目（更新于${new Date().toLocaleTimeString()}）`;
          updated.isFeatured = !updated.isFeatured;
        });
        addEvent('success', `已更新测试项目，ID: ${testItemId.current}`);
      });
    } catch (error) {
      addEvent('error', `更新失败: ${error.message}`);
    }
  };

  // 删除测试项目
  const deleteTestItem = async () => {
    try {
      if (!testItemId.current) {
        Alert.alert('提示', '请先开始观察以创建测试项目');
        return;
      }

      const collection = getArticlesCollection();
      if (!collection) {
        throw new Error('无法获取articles集合');
      }

      await database.write(async () => {
        const item = await collection.find(testItemId.current);
        await item.destroyPermanently();
        addEvent('success', `已删除测试项目，ID: ${testItemId.current}`);
        testItemId.current = null;
      });
    } catch (error) {
      addEvent('error', `删除失败: ${error.message}`);
    }
  };

  // 组件卸载时确保取消订阅
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);
  // 新增：开始观察指定列
  const startObservingColumns = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) {
        throw new Error('无法获取articles集合');
      }

      // 取消之前的订阅
      if (columnsSubscriptionRef.current) {
        columnsSubscriptionRef.current.unsubscribe();
      }

      addEvent(
        'info',
        `[observeWithColumns] 开始观察指定列: ${selectedColumns.join(', ')}`,
      );

      // 创建查询并观察指定列
      const query = collection.query();
      columnsSubscriptionRef.current = query
        .observeWithColumns(selectedColumns)
        .subscribe({
          next: items => {
            setObservedColumns(items);
            addEvent(
              'update',
              `[observeWithColumns] 数据更新: 共${items.length}条记录`,
            );
          },
          error: error => {
            addEvent(
              'error',
              `[observeWithColumns] 观察出错: ${error.message}`,
            );
            console.error('观察列错误:', error);
          },
          complete: () => {
            addEvent('info', '[observeWithColumns] 观察已完成');
          },
        });
    } catch (error) {
      addEvent('error', `[observeWithColumns] 启动观察失败: ${error.message}`);
    }
  };

  // 新增：停止观察指定列
  const stopObservingColumns = () => {
    if (columnsSubscriptionRef.current) {
      columnsSubscriptionRef.current.unsubscribe();
      columnsSubscriptionRef.current = null;
      setObservedColumns([]);
      addEvent('info', '[observeWithColumns] 已停止观察指定列');
    }
  };

  // 新增：切换列选择
  const toggleColumn = column => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column],
    );
  };

  // 新增：开始观察计数
  const startObservingCount = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) {
        throw new Error('无法获取articles集合');
      }

      // 取消之前的订阅
      if (countSubscriptionRef.current) {
        countSubscriptionRef.current.unsubscribe();
      }

      // 创建带过滤条件的查询
      let query = collection.query();
      if (countFilter === 'featured') {
        query = query.where('isFeatured', '=', true);
        addEvent('info', '[observeCount] 开始观察精选项目的数量变化');
      } else {
        addEvent('info', '[observeCount] 开始观察所有项目的数量变化');
      }

      // 观察计数
      countSubscriptionRef.current = query.observeCount().subscribe({
        next: count => {
          setItemCount(count);
          addEvent('update', `[observeCount] 数量更新: ${count}条记录`);
        },
        error: error => {
          addEvent('error', `[observeCount] 观察计数出错: ${error.message}`);
          console.error('观察计数错误:', error);
        },
        complete: () => {
          addEvent('info', '[observeCount] 计数观察已完成');
        },
      });
    } catch (error) {
      addEvent('error', `[observeCount] 启动计数观察失败: ${error.message}`);
    }
  };

  // 新增：停止观察计数
  const stopObservingCount = () => {
    if (countSubscriptionRef.current) {
      countSubscriptionRef.current.unsubscribe();
      countSubscriptionRef.current = null;
      setItemCount(0);
      addEvent('info', '[observeCount] 已停止观察计数');
    }
  };

  // 新增：切换计数过滤器
  const changeCountFilter = filter => {
    setCountFilter(filter);
    // 如果正在观察，重新启动观察以应用新的过滤器
    if (countSubscriptionRef.current) {
      startObservingCount();
    }
  };

  // 组件卸载时确保取消所有订阅
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (columnsSubscriptionRef.current) {
        columnsSubscriptionRef.current.unsubscribe();
      }
      if (countSubscriptionRef.current) {
        countSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  // 渲染事件日志项
  const renderEvent = event => {
    let bgColor;
    switch (event.type) {
      case 'success':
        bgColor = '#e8f5e9';
        break;
      case 'error':
        bgColor = '#ffebee';
        break;
      case 'update':
        bgColor = '#fff8e1';
        break;
      default:
        bgColor = '#e3f2fd';
    }
    return (
      <View
        key={event.id}
        style={[styles.eventItem, { backgroundColor: bgColor }]}>
        <Text style={styles.eventTime}>{event.timestamp}</Text>
        <Text style={styles.eventMessage}>{event.message}</Text>
      </View>
    );
  };

  // 新增：渲染观察到的列数据
  const renderObservedColumnItem = (item, index) => {
    return (
      <View key={index} style={styles.columnItem}>
        {selectedColumns.map(column => (
          <Text key={column} style={styles.columnText}>
            <Text style={styles.columnLabel}>{column}: </Text>
            {item[column] || 'N/A'}
          </Text>
        ))}
      </View>
    );
  };
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>WatermelonDB 观察方法测试</Text>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>状态: {status}</Text>
      </View>

      {/* 原有 observe() 测试区域 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. observe() 方法测试</Text>
        <View style={styles.controls}>
          <Button title="开始观察" onPress={startObserving} color="#2196f3" />
          <Button title="停止观察" onPress={stopObserving} color="#f44336" />
        </View>
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            观察到的项目总数: {observedItems.length}
          </Text>
        </View>
      </View>

      {/* 新增 observeWithColumns() 测试区域 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          2. observeWithColumns() 方法测试
        </Text>
        <Text style={styles.sectionDescription}>
          选择要观察的列（只获取指定字段的数据）:
        </Text>
        <View style={styles.columnsSelector}>
          {['title', 'author', 'publishDate', 'isFeatured'].map(column => (
            <TouchableOpacity
              key={column}
              style={[
                styles.columnButton,
                selectedColumns.includes(column) ? styles.selectedColumn : {},
              ]}
              onPress={() => toggleColumn(column)}>
              <Text style={styles.columnButtonText}>{column}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.controls}>
          <Button
            title="开始观察指定列"
            onPress={startObservingColumns}
            color="#9c27b0"
          />
          <Button
            title="停止观察指定列"
            onPress={stopObservingColumns}
            color="#795548"
          />
        </View>
        <View style={styles.observedDataContainer}>
          <Text style={styles.dataTitle}>观察到的列数据:</Text>
          {observedColumns.length > 0 ? (
            observedColumns.map(renderObservedColumnItem)
          ) : (
            <Text style={styles.noDataText}>
              未观察到数据，请选择列并点击"开始观察指定列"
            </Text>
          )}
        </View>
      </View>

      {/* 新增 observeCount() 测试区域 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. observeCount() 方法测试</Text>
        <Text style={styles.sectionDescription}>选择计数过滤条件:</Text>
        <View style={styles.filterSelector}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              countFilter === 'all' ? styles.selectedFilter : {},
            ]}
            onPress={() => changeCountFilter('all')}>
            <Text style={styles.filterButtonText}>所有项目</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              countFilter === 'featured' ? styles.selectedFilter : {},
            ]}
            onPress={() => changeCountFilter('featured')}>
            <Text style={styles.filterButtonText}>仅精选项目</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.controls}>
          <Button
            title="开始观察计数"
            onPress={startObservingCount}
            color="#ff5722"
          />
          <Button
            title="停止观察计数"
            onPress={stopObservingCount}
            color="#607d8b"
          />
        </View>
        <View style={styles.stats}>
          <Text style={styles.statsText}>当前计数: {itemCount}</Text>
        </View>
      </View>

      {/* 通用操作按钮 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>测试数据操作</Text>
        <View style={styles.controls}>
          <Button title="更新测试项" onPress={updateTestItem} color="#4caf50" />
          <Button title="删除测试项" onPress={deleteTestItem} color="#ff9800" />
        </View>
      </View>

      {/* 事件日志区域 */}
      <View style={styles.eventsContainer}>
        <Text style={styles.eventsTitle}>事件日志</Text>
        {events.length === 0 ? (
          <Text style={styles.noEvents}>尚未有事件，请点击"开始观察"按钮</Text>
        ) : (
          events.map(renderEvent)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusBar: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusText: {
    fontSize: 16,
    color: '#555',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  stats: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statsText: {
    fontSize: 16,
    color: '#555',
  },
  eventsContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  eventItem: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  eventMessage: {
    fontSize: 14,
    color: '#333',
  },
  noEvents: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    padding: 16,
  },
});
