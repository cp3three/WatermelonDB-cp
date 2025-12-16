// MarkAllAsDeletedTest.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { database } from './database';
import { Q } from '@react-native-ohos/watermelondb';

// 生成唯一ID的辅助函数
let keyCounter = 0;
const generateUniqueKey = () => {
  const timestamp = Date.now();
  keyCounter = (keyCounter + 1) % Number.MAX_SAFE_INTEGER;
  const random = Math.floor(Math.random() * 1000000);
  return `${timestamp}-${keyCounter}-${random}`;
};

// 日期格式化辅助函数
const formatDateForWatermelon = date => {
  if (typeof date === 'number') {
    return new Date(date).toISOString();
  }
  if (date instanceof Date) {
    return date.toISOString();
  }
  if (!date || typeof date !== 'string') {
    return new Date().toISOString();
  }
  try {
    return new Date(date).toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
};

export default function MarkAllAsDeletedTest() {
  // 状态定义
  const [status, setStatus] = useState('准备就绪');
  const [events, setEvents] = useState([]);
  const [collectionName, setCollectionName] = useState('articles');
  const [itemCount, setItemCount] = useState(0); // 总项目数
  const [deletedCount, setDeletedCount] = useState(0); // 已删除数
  const [serializedData, setSerializedData] = useState('');
  const [pipeResult, setPipeResult] = useState('');
  const [modelClassInfo, setModelClassInfo] = useState({});
  const [selectedItemId, setSelectedItemId] = useState('');
  const operationInProgress = useRef(false);
  const [allItemIds, setAllItemIds] = useState([]);
  
  // ===== 新增：getSecondaryTables 测试状态 =====
  const [secondaryTablesInfo, setSecondaryTablesInfo] = useState({});
  const [secondaryTableData, setSecondaryTableData] = useState('');
  const [secondaryTestResult, setSecondaryTestResult] = useState('');

  // 获取集合引用
  const getCollection = () => {
    if (!database) {
      addEvent('error', '数据库实例未初始化');
      return null;
    }
    if (!database.collections) {
      addEvent('error', '数据库collections不存在');
      return null;
    }
    try {
      const collection = database.collections.get(collectionName);
      if (!collection) {
        addEvent('error', `集合${collectionName}未注册`);
        return null;
      }
      return collection;
    } catch (error) {
      addEvent('error', `获取集合${collectionName}失败: ${error.message}`);
      return null;
    }
  };

  // 添加事件日志
  const addEvent = (type, message) => {
    const newItem = {
      id: generateUniqueKey(),
      type,
      message,
      timestamp: new Date().toLocaleString(),
    };
    setEvents(prev => [newItem, ...prev.slice(0, 29)]);
  };

  // 创建测试数据
  const createTestData = async (count = 5) => {
    if (operationInProgress.current) {
      Alert.alert('提示', '操作正在进行中，请稍候');
      return;
    }
    try {
      operationInProgress.current = true;
      setStatus('正在创建测试数据...');
      addEvent('info', `开始创建${count}条测试数据`);
      const collection = getCollection();
      if (!collection) throw new Error('无法获取有效的集合实例');

      await database.write(async () => {
        const currentTime = new Date();
        const createdIds = [];
        for (let i = 0; i < count; i++) {
          const newItem = await collection.create(record => {
            record.title = `测试项目 ${currentTime.getTime()}-${i}`;
            record.content = `这是第${i + 1}条测试数据，创建于${currentTime.toLocaleString()}`;
            record.author = '测试脚本';
            record.created_at = formatDateForWatermelon(currentTime);
          });
          createdIds.push(newItem.id);
          addEvent('info', `创建数据成功，ID: ${newItem.id}`);
        }
        addEvent('info', `本次创建的ID列表: [${createdIds.join(', ')}]`);
      });

      addEvent('success', `成功创建${count}条测试数据`);
      setStatus('测试数据创建完成');
      await countCollectionItems(); // 创建后刷新统计
    } catch (error) {
      addEvent('error', `创建测试数据失败: ${error.message}`);
      setStatus('创建测试数据失败');
      console.error('创建数据错误:', error);
      console.error('错误堆栈:', error.stack);
    } finally {
      operationInProgress.current = false;
    }
  };

  // 修复：testMarkAllAsDeleted 方法（核心修复总项目数逻辑）
  const testMarkAllAsDeleted = async () => {
    if (operationInProgress.current) {
      Alert.alert('提示', '操作正在进行中，请稍候');
      return;
    }

    try {
      operationInProgress.current = true;
      setStatus('正在执行markAllAsDeleted()方法...');
      addEvent('info', '开始标记所有项目为已删除');

      const collection = getCollection();
      if (!collection) throw new Error('无法获取集合');

      let deleteCount = 0;
      let totalItems = 0;

      await database.write(async () => {
        const query = collection.query();
        // 1. 获取所有数据（包括已删除），记录总数量
        const allItems = await query.fetch({ withDeleted: true });
        totalItems = allItems.length;

        addEvent('debug', `开始调用markAllAsDeleted，共${totalItems}条记录`);
        await query.markAllAsDeleted();

        // 2. 事务内验证删除结果（读取_raw._status，匹配数据结构）
        const updatedItems = await query.fetch({ withDeleted: true });
        const actuallyDeleted = updatedItems.filter(item => {
          if (!item || !item._raw) return false;
          return ['deleted', 'tombstone'].includes(item._raw._status);
        });
        deleteCount = actuallyDeleted.length;

        addEvent('debug', `事务内验证：成功标记${deleteCount}/${totalItems}条`);
      });

      // 3. 先更新临时状态，保证UI及时反馈
      setDeletedCount(deleteCount);
      setItemCount(totalItems); // 总项目数 = 操作前的总数量
      addEvent('success', `成功标记${deleteCount}条记录为软删除`);
      setStatus('markAllAsDeleted执行完成');

      // 4. 最终验证（等待异步完成，确保数据最新）
      const finalVerify = async () => {
        const allItems = await collection.query().fetch({ withDeleted: true });
        const finalTotal = allItems.length; // 最新总数量
        const finalDeleted = allItems.filter(item => {
          if (!item || !item._raw) return false;
          return ['deleted', 'tombstone'].includes(item._raw._status);
        });
        // 同步更新最终状态
        setItemCount(finalTotal);
        setDeletedCount(finalDeleted.length);
        await countCollectionItems(); // 强制刷新统计
      };
      await finalVerify(); // 等待验证完成

      return deleteCount;
    } catch (error) {
      addEvent('error', `操作失败: ${error.message}`);
      setStatus('markAllAsDeleted执行失败');
      console.error('删除错误:', error);
      return 0;
    } finally {
      operationInProgress.current = false;
    }
  };

  // 修复：countCollectionItems 方法（核心更新总项目数和已删除数）
  const countCollectionItems = async () => {
    try {
      const collection = getCollection();
      if (!collection) return;

      // 1. 获取最新数据（包括已删除）
      const queryWithDeleted = collection.query();
      queryWithDeleted.description = queryWithDeleted._rawDescription;
      const allItems = await queryWithDeleted.fetch({ withDeleted: true }); // 显式指定withDeleted
      const totalCount = allItems.length; // 总项目数

      // 2. 统一检测删除状态（读取_raw._status）
      let deletedItems = [];
      if (totalCount > 0) {
        // 详细日志：输出所有记录的真实状态
        const statusLog = allItems
          .map(
            item =>
              `ID:${item.id} _raw._status:${item?._raw?._status || '未知'}`,
          )
          .join('; ');
        addEvent('debug', `所有记录状态: ${statusLog}`);

        // 核心检测：兼容空值，读取正确的状态字段
        deletedItems = allItems.filter(item => {
          if (!item || !item._raw) return false;
          return ['deleted', 'tombstone'].includes(item._raw._status);
        });
      }

      // 3. 同步更新UI状态（关键：总项目数和已删除数）
      setItemCount(totalCount); // 总项目数 = 所有数据条数（包括已删除）
      setDeletedCount(deletedItems.length); // 已删除数 = 标记为删除的条数
      addEvent('info', `检测到 ${deletedItems.length} 条已删除记录`);

      // 4. 更新有效ID列表
      const ids = allItems.map(item => item.id);
      setAllItemIds(ids);
      if (
        ids.length > 0 &&
        (!selectedItemId || !ids.includes(selectedItemId))
      ) {
        setSelectedItemId(ids[0]);
      } else if (ids.length === 0) {
        setSelectedItemId('');
      }

      addEvent(
        'info',
        `统计完成 - 总: ${totalCount}, 已删除: ${deletedItems.length}`,
      );
    } catch (error) {
      addEvent('error', `统计失败: ${error.message}`);
      console.error('统计错误:', error);
    }
  };

  // 永久删除逻辑（保持不变，优化统计刷新）
  const purgeDeletedItems = async () => {
    if (operationInProgress.current) {
      Alert.alert('提示', '操作正在进行中，请稍候');
      return;
    }
    try {
      operationInProgress.current = true;
      setStatus('正在永久删除已标记的项目...');
      addEvent('info', '开始永久删除已标记项目');

      const collection = getCollection();
      if (!collection) throw new Error('无法获取集合');

      await database.write(async () => {
        const allItems = await collection.query().fetch({ withDeleted: true });
        const deletedItems = allItems.filter(item => {
          if (!item || !item._raw) return false;
          return ['deleted', 'tombstone'].includes(item._raw._status);
        });

        for (const item of deletedItems) {
          await item.destroyPermanently();
        }
        addEvent(
          'info',
          `永久删除${deletedItems.length}个已标记项目，ID列表: [${deletedItems.map(item => item.id).join(', ')}]`,
        );
      });

      addEvent('success', '已永久删除所有标记为删除的项目');
      setStatus('永久删除完成');
      // 强制刷新统计（等待数据库操作完成）
      await new Promise(resolve => setTimeout(resolve, 300));
      await countCollectionItems();
    } catch (error) {
      addEvent('error', `永久删除失败: ${error.message}`);
      setStatus('永久删除失败');
      console.error('永久删除错误:', error);
    } finally {
      operationInProgress.current = false;
    }
  };

  // 清空所有数据（保持不变）
  const clearAllData = async () => {
    Alert.alert('确认', '确定要清空该集合的所有数据吗？此操作不可恢复！', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          if (operationInProgress.current) return;
          try {
            operationInProgress.current = true;
            setStatus('正在清空所有数据...');
            addEvent('warning', '开始清空集合所有数据');

            const collection = getCollection();
            if (!collection) throw new Error('无法获取集合');

            await database.write(async () => {
              const allItems = await collection
                .query()
                .fetch({ withDeleted: true });
              for (const item of allItems) {
                await item.destroyPermanently();
              }
            });

            addEvent('success', '已清空集合所有数据');
            setStatus('数据已清空');
            setSelectedItemId('');
            setAllItemIds([]);
            setSerializedData('');
            setPipeResult('');
            setModelClassInfo({});
            setItemCount(0); // 清空总项目数
            setDeletedCount(0); // 清空已删除数
            // ===== 新增：清空二级表测试状态 =====
            setSecondaryTablesInfo({});
            setSecondaryTableData('');
            setSecondaryTestResult('');
            await countCollectionItems();
          } catch (error) {
            addEvent('error', `清空数据失败: ${error.message}`);
            setStatus('清空数据失败');
            console.error('清空数据错误:', error);
          } finally {
            operationInProgress.current = false;
          }
        },
      },
    ]);
  };

  // serialize测试方法（保持不变）
  const testSerialize = async () => {
    if (operationInProgress.current || !selectedItemId) {
      if (!selectedItemId) Alert.alert('提示', '请先创建测试数据');
      return;
    }
    try {
      operationInProgress.current = true;
      setStatus('正在测试serialize()方法...');
      addEvent('info', `序列化ID为${selectedItemId}的项目`);

      const collection = getCollection();
      if (!collection) throw new Error('无法获取集合');

      let item = null;
      try {
        item = await collection.find(selectedItemId);
        addEvent('info', '使用collection.find()成功查询到项目');
      } catch (findError) {
        addEvent('warning', `find查询失败，尝试降级查询: ${findError.message}`);
        const items = await collection
          .query(Q.byId(selectedItemId))
          .fetch({ withDeleted: true });
        if (items.length > 0) {
          item = items[0];
        } else {
          addEvent('warning', 'Q.byId查询也失败，尝试遍历所有数据查找');
          const allItems = await collection
            .query()
            .fetch({ withDeleted: true });
          item = allItems.find(i => i.id === selectedItemId);
        }
      }

      addEvent(
        'info',
        `查询结果: ${item ? '找到项目' : '未找到项目'}, 查询ID: ${selectedItemId}, 所有可用ID: [${allItemIds.join(', ')}]`,
      );

      if (!item) {
        addEvent(
          'warning',
          `未找到ID为${selectedItemId}的项目，自动刷新ID列表并重试`,
        );
        await countCollectionItems();
        if (allItemIds.length > 0) {
          const newSelectedId = allItemIds[0];
          setSelectedItemId(newSelectedId);
          addEvent('info', `已自动切换到有效ID: ${newSelectedId}`);
          operationInProgress.current = false;
          await testSerialize();
          return;
        } else {
          throw new Error(
            `未找到ID为${selectedItemId}的项目，且当前无任何有效ID`,
          );
        }
      }

      let serialized;
      if (typeof item.serialize === 'function') {
        try {
          serialized = item.serialize();
          addEvent('info', '使用模型自带的serialize方法');
        } catch (serializeError) {
          addEvent(
            'warning',
            `模型serialize方法执行失败: ${serializeError.message}，使用手动序列化`,
          );
          serialized = {
            id: item.id,
            title: item.title,
            content: item.content,
            author: item.author,
            created_at: item.created_at,
            _status:
              item?._raw?._status ||
              item._status ||
              item._isDeleted ||
              item.deleted,
            createdAt: item.createdAt || item.created_at,
          };
        }
      } else {
        serialized = {
          id: item.id,
          title: item.title,
          content: item.content,
          author: item.author,
          created_at: item.created_at,
          _status:
            item?._raw?._status ||
            item._status ||
            item._isDeleted ||
            item.deleted,
          createdAt: item.createdAt || item.created_at,
        };
        addEvent('warning', '使用手动序列化兼容方案');
      }

      setSerializedData(JSON.stringify(serialized, null, 2));
      addEvent(
        'success',
        `serialize执行成功，项目ID: ${item.id}, 删除状态: ${item?._raw?._status || item._status || item._isDeleted || item.deleted}`,
      );
      setStatus('serialize执行完成');
    } catch (error) {
      addEvent('error', `serialize执行失败: ${error.message}`);
      setStatus('serialize执行失败');
      console.error('serialize错误:', error);
    } finally {
      operationInProgress.current = false;
    }
  };

  // pipe测试（保持不变）
  const testPipe = async () => {
    if (operationInProgress.current) {
      Alert.alert('提示', '操作正在进行中，请稍候');
      return;
    }
    try {
      operationInProgress.current = true;
      setStatus('正在测试pipe()方法...');
      addEvent('info', '开始测试pipe()方法');

      const collection = getCollection();
      if (!collection) throw new Error('无法获取集合');

      const filterLongTitles = items =>
        items.filter(item => item.title && item.title.length > 10);
      const mapToTitles = items => items.map(item => item.title || '无标题');
      const sortAlphabetically = titles => titles.sort();

      const items = await collection.query().fetch({ withDeleted: true });
      let result;

      if (typeof items.pipe === 'function') {
        result = items.pipe(filterLongTitles, mapToTitles, sortAlphabetically);
        addEvent('info', '使用原生pipe方法');
      } else {
        result = sortAlphabetically(mapToTitles(filterLongTitles(items)));
        addEvent('warning', '使用手动管道处理');
      }

      setPipeResult(JSON.stringify(result, null, 2));
      addEvent('success', `pipe执行成功，处理结果数量: ${result.length}`);
      setStatus('pipe执行完成');
    } catch (error) {
      addEvent('error', `pipe执行失败: ${error.message}`);
      setStatus('pipe执行失败');
      console.error('pipe错误:', error);
    } finally {
      operationInProgress.current = false;
    }
  };

  // modelClass测试（保持不变）
  const testModelClass = async () => {
    if (operationInProgress.current) {
      Alert.alert('提示', '操作正在进行中，请稍候');
      return;
    }
    try {
      operationInProgress.current = true;
      setStatus('正在获取modelClass信息...');
      addEvent('info', `获取${collectionName}集合的modelClass信息`);

      const collection = getCollection();
      if (!collection) throw new Error('无法获取集合');

      const modelClass = collection.modelClass || {};
      const sampleItem =
        (await collection.query().fetch({ withDeleted: true }))[0] || {};

      const modelInfo = {
        name: modelClass.name || '未知',
        table: modelClass.table || '未知',
        hasSerialize: typeof sampleItem.serialize === 'function' ? '是' : '否',
        hasPipe:
          typeof (await collection.query().fetch()).pipe === 'function'
            ? '是'
            : '否',
        fields: [
          'title',
          'content',
          'author',
          'created_at',
          '_status',
          '_isDeleted',
          'deleted',
        ].join(', '),
      };

      setModelClassInfo(modelInfo);
      addEvent('success', 'modelClass信息获取成功');
      setStatus('modelClass查询完成');
    } catch (error) {
      addEvent('error', `modelClass查询失败: ${error.message}`);
      setStatus('modelClass查询失败');
      console.error('modelClass错误:', error);
    } finally {
      operationInProgress.current = false;
    }
  };

  // ===== 新增：getSecondaryTables 核心测试方法 =====
  const testGetSecondaryTables = async () => {
    if (operationInProgress.current) {
      Alert.alert('提示', '操作正在进行中，请稍候');
      return;
    }
    try {
      operationInProgress.current = true;
      setStatus('正在测试getSecondaryTables()方法...');
      addEvent('info', `开始查询${collectionName}模型的二级表配置`);

      const collection = getCollection();
      if (!collection) throw new Error('无法获取集合');

      // 1. 获取模型类 & 调用 getSecondaryTables
      const modelClass = collection.modelClass;
      let secondaryTables = [];
      let tablesInfo = {};

      if (modelClass && typeof modelClass.getSecondaryTables === 'function') {
        // 调用原生 getSecondaryTables 方法
        secondaryTables = modelClass.getSecondaryTables();
        addEvent('info', `模型类原生getSecondaryTables返回: [${secondaryTables.join(', ')}]`);
      } else {
        // 兼容模式：检测副表（鸿蒙版可能重命名/隐藏方法）
        addEvent('warning', '模型类未暴露getSecondaryTables方法，尝试兼容检测');
        // 手动检测常见副表（如article_comments/article_tags）
        const commonSecondaryTables = ['article_comments', 'article_tags', 'user_addresses'];
        secondaryTables = commonSecondaryTables.filter(tableName => {
          try {
            database.collections.get(tableName);
            return true;
          } catch (e) {
            return false;
          }
        });
      }

      // 2. 收集二级表信息（是否存在、数据量、关联主表ID）
      tablesInfo = {
        mainTable: collectionName,
        secondaryTables: secondaryTables,
        hasSecondaryTables: secondaryTables.length > 0,
        tableCount: secondaryTables.length,
      };

      // 3. 查询二级表数据（关联当前选中的主表ID）
      let secondaryData = {};
      if (secondaryTables.length > 0 && selectedItemId) {
        addEvent('info', `查询二级表关联数据（主表ID: ${selectedItemId}）`);
        for (const table of secondaryTables) {
          try {
            const secCollection = database.collections.get(table);
            const relatedItems = await secCollection
              .query(Q.where(`${collectionName}_id`, selectedItemId))
              .fetch({ withDeleted: true });
            
            secondaryData[table] = {
              count: relatedItems.length,
              items: relatedItems.map(item => ({
                id: item.id,
                mainId: item[`${collectionName}_id`],
                content: item.content || item.name || item.value || '无内容',
                _status: item?._raw?._status || '未知',
              })),
            };
            addEvent('info', `二级表${table}关联数据量: ${relatedItems.length}`);
          } catch (e) {
            secondaryData[table] = {
              error: e.message,
              count: 0,
              items: [],
            };
            addEvent('error', `查询二级表${table}失败: ${e.message}`);
          }
        }
      }

      // 4. 更新状态
      setSecondaryTablesInfo(tablesInfo);
      setSecondaryTableData(JSON.stringify(secondaryData, null, 2));
      setSecondaryTestResult(`
✅ getSecondaryTables 测试完成:
- 主表: ${tablesInfo.mainTable}
- 二级表数量: ${tablesInfo.tableCount}
- 二级表列表: [${tablesInfo.secondaryTables.join(', ')}]
- 是否关联当前主表ID(${selectedItemId}): ${secondaryTables.length > 0 ? '是' : '否'}
- 兼容模式: ${!modelClass?.getSecondaryTables ? '是' : '否'}
      `);

      addEvent('success', `getSecondaryTables测试完成，检测到${tablesInfo.tableCount}个二级表`);
      setStatus('getSecondaryTables测试完成');
    } catch (error) {
      setSecondaryTestResult(`❌ 测试失败: ${error.message}`);
      addEvent('error', `getSecondaryTables测试失败: ${error.message}`);
      setStatus('getSecondaryTables测试失败');
      console.error('getSecondaryTables错误:', error);
    } finally {
      operationInProgress.current = false;
    }
  };

  // 初始化（增加重试逻辑）
  useEffect(() => {
    setStatus('初始化中...');
    const initData = async () => {
      let retries = 3;
      while (retries > 0) {
        try {
          await countCollectionItems();
          setStatus('初始化完成');
          return;
        } catch (error) {
          retries--;
          addEvent(
            'warning',
            `初始化失败，剩余重试次数: ${retries}, 错误: ${error.message}`,
          );
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      setStatus('初始化失败');
      addEvent('error', '初始化重试次数用尽，数据库可能未正确加载');
    };
    setTimeout(initData, 500);
    return () => {
      operationInProgress.current = false;
    };
  }, [collectionName]);

  // 渲染事件日志
  const renderEvent = event => {
    let bgColor;
    switch (event.type) {
      case 'success':
        bgColor = '#e8f5e9';
        break;
      case 'error':
        bgColor = '#ffebee';
        break;
      case 'warning':
        bgColor = '#fff3e0';
        break;
      case 'debug':
        bgColor = '#f1f8e9';
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

  // 渲染UI
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>WatermelonDB 综合测试</Text>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>状态: {status}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>集合配置</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>集合名称:</Text>
          <TextInput
            style={styles.input}
            value={collectionName}
            onChangeText={setCollectionName}
            placeholder="articles"
            placeholderTextColor="#999"
            editable={false}
          />
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>总项目数: {itemCount}</Text>
          <Text style={styles.statsText}>已标记删除数: {deletedCount}</Text>
          <Text style={styles.statsText}>
            有效项目数: {itemCount - deletedCount}
          </Text>{' '}
          {/* 新增：有效项目数 */}
          {selectedItemId && (
            <Text style={styles.statsText}>
              当前测试项目ID: {selectedItemId}
            </Text>
          )}
          <ScrollView style={{height:80}}>
            {allItemIds.length > 0 && (
              <Text style={styles.statsText}>
                所有ID: {allItemIds.join(', ')}
              </Text>
            )}
          </ScrollView>
        </View>

        <Button
          title="刷新统计"
          onPress={countCollectionItems}
          color="#2196f3"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基础操作测试</Text>
        <View style={styles.buttonGroup}>
          <Button
            title="创建5条测试数据"
            onPress={() => createTestData(5)}
            color="#4caf50"
          />
          <Button
            title="创建10条测试数据"
            onPress={() => createTestData(10)}
            color="#8bc34a"
          />
        </View>
        <View style={styles.buttonGroup}>
          <Button
            title="标记所有为删除"
            onPress={testMarkAllAsDeleted}
            color="#ff9800"
          />
          <Button
            title="永久删除已标记项"
            onPress={purgeDeletedItems}
            color="#f44336"
          />
        </View>
        <View style={styles.singleButtonContainer}>
          <Button
            title="清空所有数据 (危险)"
            onPress={clearAllData}
            color="#9c27b0"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>serialize() 测试</Text>
        <Text style={styles.sectionDescription}>将模型实例序列化为纯对象</Text>
        <View style={styles.buttonGroup}>
          <Button
            title="执行 serialize()"
            onPress={testSerialize}
            color="#03a9f4"
            disabled={!selectedItemId}
          />
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSerializedData('')}>
            <Text style={styles.clearButtonText}>清空结果</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>序列化结果:</Text>
          {serializedData ? (
            <Text style={styles.resultText}>{serializedData}</Text>
          ) : (
            <Text style={styles.noResultText}>暂无数据，请先创建测试数据</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>pipe() 测试</Text>
        <Text style={styles.sectionDescription}>链式处理查询结果</Text>
        <View style={styles.buttonGroup}>
          <Button title="执行 pipe()" onPress={testPipe} color="#4CAF50" />
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setPipeResult('')}>
            <Text style={styles.clearButtonText}>清空结果</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Pipe处理结果:</Text>
          {pipeResult ? (
            <Text style={styles.resultText}>{pipeResult}</Text>
          ) : (
            <Text style={styles.noResultText}>暂无数据，请先创建测试数据</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>modelClass 测试</Text>
        <Text style={styles.sectionDescription}>获取模型类信息</Text>
        <View style={styles.buttonGroup}>
          <Button
            title="获取 modelClass 信息"
            onPress={testModelClass}
            color="#9C27B0"
          />
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setModelClassInfo({})}>
            <Text style={styles.clearButtonText}>清空信息</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>模型类信息:</Text>
          {Object.keys(modelClassInfo).length > 0 ? (
            <View style={styles.modelInfoContainer}>
              <Text style={styles.modelInfoText}>
                模型名称: {modelClassInfo.name}
              </Text>
              <Text style={styles.modelInfoText}>
                数据表名: {modelClassInfo.table}
              </Text>
              <Text style={styles.modelInfoText}>
                支持serialize: {modelClassInfo.hasSerialize}
              </Text>
              <Text style={styles.modelInfoText}>
                支持pipe: {modelClassInfo.hasPipe}
              </Text>
              <Text style={styles.modelInfoText}>
                字段列表: {modelClassInfo.fields}
              </Text>
            </View>
          ) : (
            <Text style={styles.noResultText}>暂无信息，请执行测试</Text>
          )}
        </View>
      </View>

      {/* ===== 新增：getSecondaryTables 测试模块 ===== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>getSecondaryTables() 测试</Text>
        <Text style={styles.sectionDescription}>查询模型关联的二级表/副表</Text>
        <View style={styles.buttonGroup}>
          <Button
            title="查询二级表配置"
            onPress={testGetSecondaryTables}
            color="#00897b"
            disabled={!selectedItemId}
          />
        </View>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSecondaryTablesInfo({});
              setSecondaryTableData('');
              setSecondaryTestResult('');
            }}>
            <Text style={styles.clearButtonText}>清空二级表信息</Text>
          </TouchableOpacity>
        </View>
        
        {/* 二级表基础信息 */}
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>二级表配置信息:</Text>
          {Object.keys(secondaryTablesInfo).length > 0 ? (
            <View style={styles.modelInfoContainer}>
              <Text style={styles.modelInfoText}>
                主表名称: {secondaryTablesInfo.mainTable}
              </Text>
              <Text style={styles.modelInfoText}>
                二级表数量: {secondaryTablesInfo.tableCount}
              </Text>
              <Text style={styles.modelInfoText}>
                是否有二级表: {secondaryTablesInfo.hasSecondaryTables ? '是' : '否'}
              </Text>
              <Text style={styles.modelInfoText}>
                二级表列表: {secondaryTablesInfo.secondaryTables.join(', ') || '无'}
              </Text>
            </View>
          ) : (
            <Text style={styles.noResultText}>暂无信息，请执行测试</Text>
          )}
        </View>

        {/* 二级表测试结果 */}
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>测试结果:</Text>
          {secondaryTestResult ? (
            <Text style={styles.resultText}>{secondaryTestResult}</Text>
          ) : (
            <Text style={styles.noResultText}>暂无测试结果</Text>
          )}
        </View>

        {/* 二级表关联数据 */}
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>二级表关联数据:</Text>
          {secondaryTableData ? (
            <ScrollView style={{maxHeight: 200}}>
              <Text style={styles.resultText}>{secondaryTableData}</Text>
            </ScrollView>
          ) : (
            <Text style={styles.noResultText}>
              {selectedItemId ? '暂无关联数据，可点击「创建关联数据」生成' : '请先创建主表数据并选中ID'}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>操作日志</Text>
        {events.length === 0 ? (
          <Text style={styles.noEvents}>暂无操作日志</Text>
        ) : (
          events.map(renderEvent)
        )}
      </View>
    </ScrollView>
  );
}

// 样式（保持不变）
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
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  statsContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  singleButtonContainer: {
    marginTop: 8,
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
    color: '#999',
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
  resultContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
    maxHeight: 200,
    overflow: 'scroll',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  resultText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'monospace',
  },
  noResultText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 8,
    fontStyle: 'italic',
  },
  clearButton: {
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
  },
  modelInfoContainer: {
    padding: 8,
  },
  modelInfoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
});