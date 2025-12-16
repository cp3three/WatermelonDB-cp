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
// 注意：确保 database 导入路径正确，且已正确初始化
import { database } from './database';

export default function ObserveMethodTest() {
  // ========== 通用状态 ==========
  const [globalStatus, setGlobalStatus] = useState('准备就绪');
  const [events, setEvents] = useState([]);
  const testItemId = useRef(null);

  // ========== Rx 依赖板块（observe/observeWithColumns） ==========
  // observe 相关
  const [rxObservedItems, setRxObservedItems] = useState([]);
  const rxSubscriptionRef = useRef(null);
  // observeWithColumns 相关
  const [rxObservedColumns, setRxObservedColumns] = useState([]);
  const rxColumnsSubscriptionRef = useRef(null);
  const [rxSelectedColumns, setRxSelectedColumns] = useState([
    'title',
    'author',
  ]);
  // observeCount 相关
  const [rxItemCount, setRxItemCount] = useState(0);
  const rxCountSubscriptionRef = useRef(null);
  const [rxCountFilter, setRxCountFilter] = useState('all');

  // ========== 无 Rx 依赖板块（experimentalSubscribe） ==========
  // experimentalSubscribe 相关
  const [expObservedItems, setExpObservedItems] = useState([]);
  const expSubscriptionRef = useRef(null);
  // experimentalSubscribeWithColumns 相关
  const [expObservedColumns, setExpObservedColumns] = useState([]);
  const expColumnsSubscriptionRef = useRef(null);
  const [expSelectedColumns, setExpSelectedColumns] = useState([
    'title',
    'author',
  ]);
  // experimentalSubscribeToCount 相关
  const [expItemCount, setExpItemCount] = useState(0);
  const expCountSubscriptionRef = useRef(null);
  const [expCountFilter, setExpCountFilter] = useState('all');

  // ========== 通用方法 ==========
  // 获取集合引用
  const getArticlesCollection = () => {
    return database?.collections?.get('articles') || null;
  };
  const formatTime = (date = new Date()) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
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

  // 通用取消订阅方法（适配不同类型的订阅返回值）
  const unsubscribeRef = ref => {
    if (ref.current) {
      try {
        // 适配 RxJS 订阅（有 unsubscribe 方法）
        if (typeof ref.current.unsubscribe === 'function') {
          ref.current.unsubscribe();
        }
        // 适配 experimentalSubscribe（返回取消订阅函数）
        else if (typeof ref.current === 'function') {
          ref.current();
        }
      } catch (error) {
        addEvent('error', `取消订阅失败: ${error.message}`);
        console.error('Unsubscribe error:', error);
      }
      ref.current = null;
    }
  };

  // 清理所有订阅
  const cleanupAllSubscriptions = () => {
    // Rx 依赖订阅清理
    unsubscribeRef(rxSubscriptionRef);
    unsubscribeRef(rxColumnsSubscriptionRef);
    unsubscribeRef(rxCountSubscriptionRef);
    // 无 Rx 依赖订阅清理
    unsubscribeRef(expSubscriptionRef);
    unsubscribeRef(expColumnsSubscriptionRef);
    unsubscribeRef(expCountSubscriptionRef);

    addEvent('info', '已清理所有订阅');
  };

  const updateTestItem = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) throw new Error('无法获取articles集合');

      // 获取数据库中的第一个项目
      const items = await collection.query().fetch();
      if (items.length === 0) {
        Alert.alert('提示', '数据库中没有可更新的项目');
        return;
      }

      // 更新第一个项目
      const item = items[0];
      await database.write(async () => {
        await item.update(updated => {
          updated.title = `更新于${formatTime(new Date())}的项目`;
          updated.isFeatured = !updated.isFeatured;
        });
        addEvent('success', `已更新项目，ID: ${item.id}`);
      });
    } catch (error) {
      addEvent('error', `更新失败: ${error.message}`);
    }
  };

  // 删除测试项目（修改：允许删除任意项目，不依赖testItemId）
  const deleteTestItem = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) throw new Error('无法获取articles集合');

      // 获取数据库中的第一个项目
      const items = await collection.query().fetch();
      if (items.length === 0) {
        Alert.alert('提示', '数据库中没有可删除的项目');
        return;
      }

      // 删除第一个项目
      const item = items[0];
      await database.write(async () => {
        await item.destroyPermanently();
        addEvent('success', `已删除项目，ID: ${item.id}`);
      });
    } catch (error) {
      addEvent('error', `删除失败: ${error.message}`);
    }
  };

  // ========== Rx 依赖板块 - 具体实现 ==========
  // Rx - 开始观察（修改：移除创建测试项目的代码）
  const startRxObserving = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) throw new Error('无法获取articles集合');

      // 取消之前的订阅
      unsubscribeRef(rxSubscriptionRef);

      setGlobalStatus('Rx依赖：正在观察数据变化...');
      addEvent('info', 'Rx依赖：开始使用observe观察articles集合的所有数据变化');

      // 创建查询
      const query = collection.query();

      // 使用传统的observe方法（rx依赖）
      rxSubscriptionRef.current = query.observe().subscribe({
        next: items => {
          setRxObservedItems(items);
          addEvent(
            'update',
            `Rx依赖[observe] 数据更新: 共${items.length}条记录`,
          );
          setGlobalStatus(
            `Rx依赖：最后更新: ${formatTime(new Date())}`,
          );
        },
        error: error => {
          addEvent('error', `Rx依赖[observe] 观察出错: ${error.message}`);
          setGlobalStatus('Rx依赖：观察出错');
          console.error('Rx观察错误:', error);
        },
        complete: () => {
          addEvent('info', 'Rx依赖[observe] 观察已完成');
          setGlobalStatus('Rx依赖：观察已完成');
        },
      });

      // 直接查询当前数据库中的数据
      const initialItems = await query.fetch();
      addEvent('info', `数据库中当前有${initialItems.length}条记录`);
    } catch (error) {
      addEvent('error', `Rx依赖[observe] 启动观察失败: ${error.message}`);
      setGlobalStatus('Rx依赖：启动观察失败');
    }
  };


  // Rx - 停止观察
  const stopRxObserving = () => {
    unsubscribeRef(rxSubscriptionRef);
    setGlobalStatus('Rx依赖：已停止观察');
    addEvent('info', 'Rx依赖：已停止observe观察数据变化');
  };

  // Rx - 开始观察指定列（修改：移除创建测试项目的代码）
  const startRxObservingColumns = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) throw new Error('无法获取articles集合');

      // 取消之前的订阅
      unsubscribeRef(rxColumnsSubscriptionRef);

      addEvent(
        'info',
        `Rx依赖：开始使用observeWithColumns观察指定列: ${rxSelectedColumns.join(', ')}`,
      );

      // 创建查询并观察指定列
      const query = collection.query();
      rxColumnsSubscriptionRef.current = query
        .observeWithColumns(rxSelectedColumns)
        .subscribe({
          next: items => {
            setRxObservedColumns(items);
            addEvent(
              'update',
              `Rx依赖[observeWithColumns] 数据更新: 共${items.length}条记录`,
            );
          },
          error: error => {
            addEvent(
              'error',
              `Rx依赖[observeWithColumns] 观察出错: ${error.message}`,
            );
            console.error('Rx观察列错误:', error);
          },
          complete: () => {
            addEvent('info', 'Rx依赖[observeWithColumns] 观察已完成');
          },
        });

      // 直接查询当前数据库中的数据
      const initialItems = await query.fetch();
      addEvent('info', `数据库中当前有${initialItems.length}条记录`);
    } catch (error) {
      addEvent(
        'error',
        `Rx依赖[observeWithColumns] 启动观察失败: ${error.message}`,
      );
    }
  };

  // Rx - 停止观察指定列
  const stopRxObservingColumns = () => {
    unsubscribeRef(rxColumnsSubscriptionRef);
    setRxObservedColumns([]);
    addEvent('info', 'Rx依赖：已停止observeWithColumns观察指定列');
  };

  // Rx - 切换列选择
  const toggleRxColumn = column => {
    setRxSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column],
    );
  };

  // Rx - 开始观察计数（修改：移除创建测试项目的代码）
  const startRxObservingCount = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) throw new Error('无法获取articles集合');

      // 取消之前的订阅
      unsubscribeRef(rxCountSubscriptionRef);

      // 创建带过滤条件的查询
      let query = collection.query();
      if (rxCountFilter === 'featured') {
        query = query.where('isFeatured', '=', true);
        addEvent('info', 'Rx依赖[observeCount] 开始观察精选项目的数量变化');
      } else {
        addEvent('info', 'Rx依赖[observeCount] 开始观察所有项目的数量变化');
      }

      // 观察计数
      rxCountSubscriptionRef.current = query.observeCount().subscribe({
        next: count => {
          setRxItemCount(count);
          addEvent('update', `Rx依赖[observeCount] 数量更新: ${count}条记录`);
        },
        error: error => {
          addEvent(
            'error',
            `Rx依赖[observeCount] 观察计数出错: ${error.message}`,
          );
          console.error('Rx观察计数错误:', error);
        },
        complete: () => {
          addEvent('info', 'Rx依赖[observeCount] 计数观察已完成');
        },
      });

      // 直接查询当前数据库中的数据计数
      const count = await query.fetchCount();
      addEvent('info', `数据库中当前符合条件的记录有${count}条`);
    } catch (error) {
      addEvent(
        'error',
        `Rx依赖[observeCount] 启动计数观察失败: ${error.message}`,
      );
    }
  };

  // Rx - 停止观察计数
  const stopRxObservingCount = () => {
    unsubscribeRef(rxCountSubscriptionRef);
    setRxItemCount(0);
    addEvent('info', 'Rx依赖[observeCount] 已停止观察计数');
  };

  // Rx - 切换计数过滤器
  const changeRxCountFilter = filter => {
    setRxCountFilter(filter);
    // 如果正在观察，重新启动观察以应用新的过滤器
    if (rxCountSubscriptionRef.current) {
      startRxObservingCount();
    }
  };

  // ========== 无 Rx 依赖板块 - 具体实现 ==========
  // 无Rx - 开始观察（修改：移除创建测试项目的代码）
  const startExpObserving = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) throw new Error('无法获取articles集合');

      // 取消之前的订阅
      unsubscribeRef(expSubscriptionRef);

      setGlobalStatus('无Rx依赖：正在观察数据变化...');
      addEvent(
        'info',
        '无Rx依赖：开始使用experimentalSubscribe观察articles集合的所有数据变化',
      );

      // 创建查询
      const query = collection.query();

      // 使用experimentalSubscribe（无rx依赖）
      expSubscriptionRef.current = query.experimentalSubscribe(items => {
        setExpObservedItems(items);
        addEvent(
          'update',
          `无Rx依赖[experimentalSubscribe] 数据更新: 共${items.length}条记录`,
        );
        setGlobalStatus(
          `无Rx依赖：最后更新: ${formatTime(new Date())}`,
        );
      });

      // 直接查询当前数据库中的数据
      const initialItems = await query.fetch();
      addEvent('info', `数据库中当前有${initialItems.length}条记录`);
    } catch (error) {
      addEvent(
        'error',
        `无Rx依赖[experimentalSubscribe] 启动观察失败: ${error.message}`,
      );
      setGlobalStatus('无Rx依赖：启动观察失败');
    }
  };

  // 无Rx - 停止观察
  const stopExpObserving = () => {
    unsubscribeRef(expSubscriptionRef);
    setGlobalStatus('无Rx依赖：已停止观察');
    addEvent('info', '无Rx依赖：已停止experimentalSubscribe观察数据变化');
  };

  // 无Rx - 开始观察指定列（修改：移除创建测试项目的代码）
  const startExpObservingColumns = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) throw new Error('无法获取articles集合');

      // 取消之前的订阅
      unsubscribeRef(expColumnsSubscriptionRef);

      addEvent(
        'info',
        `无Rx依赖：开始使用experimentalSubscribeWithColumns观察指定列: ${expSelectedColumns.join(', ')}`,
      );

      // 创建查询并观察指定列
      const query = collection.query();
      expColumnsSubscriptionRef.current =
        query.experimentalSubscribeWithColumns(expSelectedColumns, items => {
          setExpObservedColumns(items);
          addEvent(
            'update',
            `无Rx依赖[experimentalSubscribeWithColumns] 数据更新: 共${items.length}条记录`,
          );
        });

      // 直接查询当前数据库中的数据
      const initialItems = await query.fetch();
      addEvent('info', `数据库中当前有${initialItems.length}条记录`);
    } catch (error) {
      addEvent(
        'error',
        `无Rx依赖[experimentalSubscribeWithColumns] 启动观察失败: ${error.message}`,
      );
    }
  };

  // 无Rx - 停止观察指定列
  const stopExpObservingColumns = () => {
    unsubscribeRef(expColumnsSubscriptionRef);
    setExpObservedColumns([]);
    addEvent(
      'info',
      '无Rx依赖：已停止experimentalSubscribeWithColumns观察指定列',
    );
  };

  // 无Rx - 切换列选择
  const toggleExpColumn = column => {
    setExpSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column],
    );
  };

  // 无Rx - 开始观察计数（修改：移除创建测试项目的代码）
  const startExpObservingCount = async () => {
    try {
      const collection = getArticlesCollection();
      if (!collection) throw new Error('无法获取articles集合');

      // 取消之前的订阅
      unsubscribeRef(expCountSubscriptionRef);

      // 创建带过滤条件的查询
      let query = collection.query();
      if (expCountFilter === 'featured') {
        query = query.where('isFeatured', '=', true);
        addEvent(
          'info',
          '无Rx依赖[experimentalSubscribeToCount] 开始观察精选项目的数量变化',
        );
      } else {
        addEvent(
          'info',
          '无Rx依赖[experimentalSubscribeToCount] 开始观察所有项目的数量变化',
        );
      }

      // 观察计数
      expCountSubscriptionRef.current = query.experimentalSubscribeToCount(
        count => {
          setExpItemCount(count);
          addEvent(
            'update',
            `无Rx依赖[experimentalSubscribeToCount] 数量更新: ${count}条记录`,
          );
        },
      );

      // 直接查询当前数据库中的数据计数
      const count = await query.fetchCount();
      addEvent('info', `数据库中当前符合条件的记录有${count}条`);
    } catch (error) {
      addEvent(
        'error',
        `无Rx依赖[experimentalSubscribeToCount] 启动计数观察失败: ${error.message}`,
      );
    }
  };

  // 无Rx - 停止观察计数
  const stopExpObservingCount = () => {
    unsubscribeRef(expCountSubscriptionRef);
    setExpItemCount(0);
    addEvent('info', '无Rx依赖[experimentalSubscribeToCount] 已停止观察计数');
  };

  // 无Rx - 切换计数过滤器
  const changeExpCountFilter = filter => {
    setExpCountFilter(filter);
    // 如果正在观察，重新启动观察以应用新的过滤器
    if (expCountSubscriptionRef.current) {
      startExpObservingCount();
    }
  };

  // ========== 生命周期 ==========
  // 组件卸载时清理所有订阅
  useEffect(() => {
    return () => {
      cleanupAllSubscriptions();
      addEvent('info', '组件卸载，已清理所有订阅');
    };
  }, []);

  // ========== 渲染辅助方法 ==========
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

  // 渲染观察到的列数据
  const renderObservedColumnItem = (item, index, selectedColumns) => {
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

  // ========== 页面渲染 ==========
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>WatermelonDB 观察方法测试</Text>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>全局状态: {globalStatus}</Text>
      </View>

      {/* ========== Rx 依赖板块 ========== */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          📌 Rx 依赖方法（observe/observeWithColumns）
        </Text>

        {/* Rx - observe() 测试区域 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. observe() 方法测试</Text>
          <View style={styles.controls}>
            <Button
              title="开始观察"
              onPress={startRxObserving}
              color="#2196f3"
            />
            <Button
              title="停止观察"
              onPress={stopRxObserving}
              color="#f44336"
            />
          </View>
          <View style={styles.stats}>
            <Text style={styles.statsText}>
              观察到的项目总数: {rxObservedItems.length}
            </Text>
          </View>
        </View>

        {/* Rx - observeWithColumns() 测试区域 */}
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
                  rxSelectedColumns.includes(column)
                    ? styles.selectedColumn
                    : {},
                ]}
                onPress={() => toggleRxColumn(column)}>
                <Text style={styles.columnButtonText}>{column}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.controls}>
            <Button
              title="开始观察指定列"
              onPress={startRxObservingColumns}
              color="#9c27b0"
            />
            <Button
              title="停止观察指定列"
              onPress={stopRxObservingColumns}
              color="#795548"
            />
          </View>
          <View style={styles.observedDataContainer}>
            <Text style={styles.dataTitle}>观察到的列数据:</Text>
            {rxObservedColumns.length > 0 ? (
              rxObservedColumns.map((item, index) =>
                renderObservedColumnItem(item, index, rxSelectedColumns),
              )
            ) : (
              <Text style={styles.noDataText}>
                未观察到数据，请选择列并点击"开始观察指定列"
              </Text>
            )}
          </View>
        </View>

        {/* Rx - observeCount() 测试区域 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. observeCount() 方法测试</Text>
          <Text style={styles.sectionDescription}>选择计数过滤条件:</Text>
          <View style={styles.filterSelector}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                rxCountFilter === 'all' ? styles.selectedFilter : {},
              ]}
              onPress={() => changeRxCountFilter('all')}>
              <Text style={styles.filterButtonText}>所有项目</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                rxCountFilter === 'featured' ? styles.selectedFilter : {},
              ]}
              onPress={() => changeRxCountFilter('featured')}>
              <Text style={styles.filterButtonText}>仅精选项目</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controls}>
            <Button
              title="开始观察计数"
              onPress={startRxObservingCount}
              color="#ff5722"
            />
            <Button
              title="停止观察计数"
              onPress={stopRxObservingCount}
              color="#607d8b"
            />
          </View>
          <View style={styles.stats}>
            <Text style={styles.statsText}>当前计数: {rxItemCount}</Text>
          </View>
        </View>
      </View>

      {/* ========== 无 Rx 依赖板块 ========== */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          📌 无 Rx 依赖方法（experimentalSubscribe）
        </Text>

        {/* 无Rx - experimentalSubscribe 测试区域 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            1. experimentalSubscribe 方法测试
          </Text>
          <View style={styles.controls}>
            <Button
              title="开始观察"
              onPress={startExpObserving}
              color="#2196f3"
            />
            <Button
              title="停止观察"
              onPress={stopExpObserving}
              color="#f44336"
            />
          </View>
          <View style={styles.stats}>
            <Text style={styles.statsText}>
              观察到的项目总数: {expObservedItems.length}
            </Text>
          </View>
        </View>

        {/* 无Rx - experimentalSubscribeWithColumns 测试区域 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. experimentalSubscribeWithColumns 方法测试
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
                  expSelectedColumns.includes(column)
                    ? styles.selectedColumn
                    : {},
                ]}
                onPress={() => toggleExpColumn(column)}>
                <Text style={styles.columnButtonText}>{column}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.controls}>
            <Button
              title="开始观察指定列"
              onPress={startExpObservingColumns}
              color="#9c27b0"
            />
            <Button
              title="停止观察指定列"
              onPress={stopExpObservingColumns}
              color="#795548"
            />
          </View>
          <View style={styles.observedDataContainer}>
            <Text style={styles.dataTitle}>观察到的列数据:</Text>
            {expObservedColumns.length > 0 ? (
              expObservedColumns.map((item, index) =>
                renderObservedColumnItem(item, index, expSelectedColumns),
              )
            ) : (
              <Text style={styles.noDataText}>
                未观察到数据，请选择列并点击"开始观察指定列"
              </Text>
            )}
          </View>
        </View>

        {/* 无Rx - experimentalSubscribeToCount 测试区域 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            3. experimentalSubscribeToCount 方法测试
          </Text>
          <Text style={styles.sectionDescription}>选择计数过滤条件:</Text>
          <View style={styles.filterSelector}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                expCountFilter === 'all' ? styles.selectedFilter : {},
              ]}
              onPress={() => changeExpCountFilter('all')}>
              <Text style={styles.filterButtonText}>所有项目</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                expCountFilter === 'featured' ? styles.selectedFilter : {},
              ]}
              onPress={() => changeExpCountFilter('featured')}>
              <Text style={styles.filterButtonText}>仅精选项目</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controls}>
            <Button
              title="开始观察计数"
              onPress={startExpObservingCount}
              color="#ff5722"
            />
            <Button
              title="停止观察计数"
              onPress={stopExpObservingCount}
              color="#607d8b"
            />
          </View>
          <View style={styles.stats}>
            <Text style={styles.statsText}>当前计数: {expItemCount}</Text>
          </View>
        </View>
      </View>

      {/* ========== 通用操作区域 ========== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 测试数据操作（通用）</Text>
        <View style={styles.controls}>
          <Button title="更新测试项" onPress={updateTestItem} color="#4caf50" />
          <Button title="删除测试项" onPress={deleteTestItem} color="#ff9800" />
        </View>
      </View>

      {/* ========== 事件日志区域 ========== */}
      <View style={styles.eventsContainer}>
        <Text style={styles.eventsTitle}>📜 事件日志</Text>
        {events.length === 0 ? (
          <Text style={styles.noEvents}>
            尚未有事件，请点击任一"开始观察"按钮
          </Text>
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
  // 面板样式（区分两个板块）
  panel: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2d3748',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
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
  section: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2d3748',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  stats: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statsText: {
    fontSize: 16,
    color: '#555',
  },
  // 列选择器样式
  columnsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  columnButton: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  selectedColumn: {
    backgroundColor: '#81b0ff',
    borderColor: '#2196f3',
  },
  columnButtonText: {
    fontSize: 14,
    color: '#333',
  },
  // 过滤选择器样式
  filterSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  selectedFilter: {
    backgroundColor: '#ffccbc',
    borderColor: '#ff5722',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
  },
  // 观察数据容器样式
  observedDataContainer: {
    marginTop: 16,
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2d3748',
  },
  columnItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  columnText: {
    fontSize: 14,
    marginBottom: 4,
  },
  columnLabel: {
    fontWeight: 'bold',
    color: '#555',
  },
  noDataText: {
    fontSize: 14,
    color: '#888',
    padding: 8,
    textAlign: 'center',
  },
  // 事件日志样式
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