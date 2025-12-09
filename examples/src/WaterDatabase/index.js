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