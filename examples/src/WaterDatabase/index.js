// examples/src/WatermelonDBSimple/index.js
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, TextInput } from 'react-native';
import { database } from './models/database';
import { Q } from '@react-native-ohos/watermelondb';
import { DatabaseProvider } from '@react-native-ohos/watermelondb/react';


// 获取集合引用
const itemsCollection = database.get('test_items');
const commentsCollection = database.get('test_comments');

const WatermelonDBSimpleBase = () => {
  const [log, setLog] = useState([]);
  const [itemName, setItemName] = useState('test_item');
  const [itemId, setItemId] = useState('');
  const [storageKey, setStorageKey] = useState('test_key');
  const [storageValue, setStorageValue] = useState('test_value');

  // 在组件内部状态中添加
  const [subscription, setSubscription] = useState(null);
  const [tableChanges, setTableChanges] = useState([]);
  
  // 自定义时间格式化函数（替代 toLocaleTimeString，无任何原生依赖）
    const formatTime = (date = new Date()) => {
        // 获取时分秒，并补零（保证格式：HH:MM:SS）
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        // 拼接成和 toLocaleTimeString() 一致的格式（如 14:35:28）
        return `${hours}:${minutes}:${seconds}`;
    };
  // 添加日志
  const addLog = (message) => {
    // setLog(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${message}`]);
    // 延迟更新日志，释放主线程
    setTimeout(() => {
        setLog(prev => [...prev.slice(-19), `[${formatTime()}] ${message}`]);
    }, 10);
  };

  // 测试 1: 基础 CRUD 操作
  const testCreate = async () => {
    try {
        console.log('###write',  database.write)
      const newItem = await database.write(async () => {
        return await itemsCollection.create(item => {
          item.name = itemName;
          item.value = Math.floor(Math.random() * 100);
          item.isActive = true;
        });
      });
      addLog(`创建成功: ID=${newItem.id}, 名称=${newItem.name}`);
      setItemId(newItem.id);
    } catch (error) {
      addLog(`创建失败: ${error.message}`);
    }
  };

  const testRead = async () => {
    try {
      const item = await database.read(async () => {
        return await itemsCollection.find(itemId);
      });
      console.log('###read',  item)
      addLog(`查询成功: ${JSON.stringify({
        id: item.id,
        name: item.name,
        value: item.value,
        isActive: item.isActive
      })}`);
    } catch (error) {
      addLog(`查询失败: ${error.message}`);
    }
  };

  const testUpdate = async () => {
    try {
      await database.write(async () => {
        const item = await itemsCollection.find(itemId);
        await item.update(item => {
          item.name = `${itemName}_更新`;
          item.isActive = false;
        });
      });
      addLog(`更新成功: ID=${itemId}`);
    } catch (error) {
      addLog(`更新失败: ${error.message}`);
    }
  };

  const testDelete = async () => {
    try {
      await database.write(async () => {
        const item = await itemsCollection.find(itemId);
        await item.markAsDeleted();
      });
      addLog(`删除成功: ID=${itemId}`);
    } catch (error) {
      addLog(`删除失败: ${error.message}`);
    }
  };

  // 测试 2: 批量操作（batch）
  const testBatch = async () => {
    try {
      await database.write(async () => {
        // 准备操作
        const newItem = itemsCollection.prepareCreate(item => {
          item.name = '批量创建项';
          item.value = 99;
          item.isActive = true;
        });

        const comment = commentsCollection.prepareCreate(cmt => {
          cmt.item.set(newItem);
          cmt.content = '批量创建的评论';
        });

        // 执行批量操作
        await database.batch(newItem, comment);
        addLog(`批量操作成功: 项ID=${newItem.id}, 评论ID=${comment.id}`);
        setItemId(newItem.id);
      });
    } catch (error) {
      addLog(`批量操作失败: ${error.message}`);
    }
  };

  // 测试 3: 高级查询（Q 构建器）
  const testQuery = async () => {
    try {
      const results = await database.read(async () => {
        return await itemsCollection.query(
          Q.where('is_active', true),
          Q.where('value', Q.gt(30)),
          Q.sortBy('created_at', Q.desc),
          Q.take(5)
        ).fetch();
      });
      addLog(`条件查询成功: ${results.length} 条结果，第一条ID=${results[0]?.id}`);
    } catch (error) {
      addLog(`条件查询失败: ${error.message}`);
    }
  };

  // 测试 4: 本地存储（LocalStorage）
  const testLocalStorage = async () => {
    try {
      // 测试复杂数据类型
      const value = { content: storageValue, timestamp: Date.now(), isTest: true };
      await database.localStorage.set(storageKey, value);
      const stored = await database.localStorage.get(storageKey);
      addLog(`本地存储成功: ${JSON.stringify(stored)}`);
    } catch (error) {
      addLog(`本地存储失败: ${error.message}`);
    }
  };

  // 测试 5: 数据库重置（unsafeResetDatabase）
  const testResetDatabase = async () => {
    try {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
      addLog('数据库重置成功');
      setItemId('');
    } catch (error) {
      addLog(`数据库重置失败: ${error.message}`);
    }
  };

  useEffect(() => {
    addLog('组件初始化完成，可开始测试');
  }, []);

  // 测试 6: 测试 experimentalSubscribe 全局变化订阅
const testExperimentalSubscribe = async () => {
  try {
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(null);
      addLog('已取消全局变化订阅');
      return;
    }

    const sub = database.experimentalSubscribe(changes => {
      addLog(`全局变化通知: ${JSON.stringify(changes)}`);
    });

    setSubscription(sub);
    addLog('已开启全局变化订阅（创建/更新项可触发）');
  } catch (error) {
    addLog(`全局订阅失败: ${error.message}`);
  }
};

// 测试 7: 测试 withChangesForTables 特定表变化监听
const testWithChangesForTables = async () => {
  try {
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(null);
      setTableChanges([]);
      addLog('已取消表变化监听');
      return;
    }

    const tablesToWatch = ['test_items'];
    const sub = database.withChangesForTables(tablesToWatch, changes => {
      const newChange = {
        time: formatTime(),
        changes: JSON.stringify(changes)
      };
      setTableChanges(prev => [...prev.slice(-4), newChange]);
      addLog(`表 ${tablesToWatch} 变化: ${JSON.stringify(changes)}`);
    });

    setSubscription(sub);
    addLog(`已开启表 ${tablesToWatch} 变化监听`);
  } catch (error) {
    addLog(`表变化监听失败: ${error.message}`);
  }
};

// 测试 8: 测试 experimentalBatchNotifications 批量通知
const testExperimentalBatchNotifications = async () => {
  try {
    database.experimentalBatchNotifications(true);
    addLog('已开启批量通知模式');
    
    // 执行批量操作验证通知合并效果
    await database.write(async () => {
      const operations = [];
      // 创建3个项目模拟批量操作
      for (let i = 0; i < 3; i++) {
        const item = itemsCollection.prepareCreate(item => {
          item.name = `批量通知测试_${i}`;
          item.value = i;
          item.isActive = true;
        });
        operations.push(item);
      }
      await database.batch(...operations);
      addLog('批量操作完成，检查通知是否合并');
    });

    // 关闭批量通知模式
    database.experimentalBatchNotifications(false);
    addLog('已关闭批量通知模式');
  } catch (error) {
    addLog(`批量通知测试失败: ${error.message}`);
  }
};

// 测试 9: 测试 _fatalError 致命错误处理
const testFatalError = async () => {
  try {
    // 保存原始错误处理函数
    const originalErrorHandler = database._fatalError;
    
    // 自定义错误处理
    database._fatalError = (error) => {
      addLog(`捕获致命错误: ${error.message}`);
      // 恢复原始处理
      database._fatalError = originalErrorHandler;
    };

    // 触发一个可能导致致命错误的操作（例如使用无效ID查询）
    await database.read(async () => {
      await itemsCollection.find('invalid_id_that_will_cause_error');
    });
  } catch (error) {
    addLog(`致命错误测试触发: ${error.message}`);
  }
};

  return (
    <DatabaseProvider database={database}>
      <View style={styles.container}>
        <Text style={styles.title}>WatermelonDB 核心方法测试</Text>

        {/* 输入区 */}
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={itemName}
            onChangeText={setItemName}
            placeholder="输入项名称"
          />
          <TextInput
            style={styles.input}
            value={itemId}
            onChangeText={setItemId}
            placeholder="操作目标ID（自动填充）"
          />
          <View style={styles.rowInput}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={storageKey}
              onChangeText={setStorageKey}
              placeholder="存储键"
            />
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 5 }]}
              value={storageValue}
              onChangeText={setStorageValue}
              placeholder="存储值"
            />
          </View>
        </View>

        {/* 操作按钮区 */}
        <View style={styles.buttons}>
          <Button title="1. 创建项" onPress={testCreate} />
          <Button title="2. 查询项" onPress={testRead} />
          <Button title="3. 更新项" onPress={testUpdate} />
          <Button title="4. 删除项" onPress={testDelete} />
          <Button title="5. 批量操作" onPress={testBatch} />
          <Button title="6. 条件查询" onPress={testQuery} />
          <Button title="7. 本地存储" onPress={testLocalStorage} />
          <Button title="8. 重置数据库" onPress={testResetDatabase} color="red" />

          <Button title="9. 测试全局订阅" onPress={testExperimentalSubscribe} />
          <Button title="10. 测试表变化监听" onPress={testWithChangesForTables} />
          <Button title="11. 测试批量通知" onPress={testExperimentalBatchNotifications} />
          <Button title="12. 测试致命错误" onPress={testFatalError} color="orange" />
        </View>

        {/* 日志区 */}
        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>操作日志</Text>
          <ScrollView style={styles.log}>
            {log.map((entry, i) => (
              <Text key={i} style={styles.logEntry}>{entry}</Text>
            ))}
          </ScrollView>
        </View>

        {tableChanges.length > 0 && (
          <View style={styles.logContainer}>
            <Text style={styles.logTitle}>表变化记录</Text>
            <ScrollView style={styles.log}>
              {tableChanges.map((change, i) => (
                <Text key={i} style={styles.logEntry}>
                  [{change.time}] {change.changes}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </DatabaseProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
    gap: 10,
  },
  rowInput: {
    flexDirection: 'row',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  logContainer: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  logTitle: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
  },
  log: {
    flex: 1,
    padding: 8,
  },
  logEntry: {
    fontSize: 12,
    marginBottom: 4,
    color: '#333',
  },
});

export default WatermelonDBSimpleBase;