// MarkAllAsDeletedTest.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import { database } from './database'; // 导入当前文件夹下的数据库
// 关键修复：导入 WatermelonDB 的 Q 查询辅助对象
import { Q } from '@react-native-ohos/watermelondb';

export default function MarkAllAsDeletedTest() {
  // 状态管理
  const [status, setStatus] = useState('准备就绪');
  const [events, setEvents] = useState([]);
  const [collectionName, setCollectionName] = useState('articles'); // 默认测试articles集合
  const [itemCount, setItemCount] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);
  
  // 引用
  const operationInProgress = useRef(false);
  
  // 获取集合引用
  const getCollection = () => {
    if (!database?.collections) {
      addEvent('error', '数据库实例或collections未找到');
      return null;
    }
    
    try {
      return database.collections.get(collectionName);
    } catch (error) {
      addEvent('error', `获取集合${collectionName}失败: ${error.message}`);
      return null;
    }
  };
  
  // 添加事件日志
  const addEvent = (type, message) => {
    const newEvent = {
      id: Date.now(),
      type, // 'info', 'success', 'error', 'warning'
      message,
      timestamp: new Date().toLocaleString()
    };
    
    // 只保留最近30条事件
    setEvents(prev => [newEvent, ...prev.slice(0, 29)]);
  };
  
  // 统计集合中的数据 - 修复 where 查询语法
  const countCollectionItems = async () => {
    try {
      const collection = getCollection();
      if (!collection) return;
      
      // 统计所有项目
      const allItems = await collection.query().fetch();
      setItemCount(allItems.length);
      
      // 关键修复：使用 Q.where() 替代直接的 where() 方法
      const deletedItems = await collection.query(
        Q.where('isDeleted', '=', true)
      ).fetch();
      setDeletedCount(deletedItems.length);
      
      addEvent('info', `统计完成 - 总项目数: ${allItems.length}, 已删除项目数: ${deletedItems.length}`);
    } catch (error) {
      addEvent('error', `统计失败: ${error.message}`);
      console.error('统计错误:', error);
    }
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
      if (!collection) throw new Error('无法获取集合');
      
      await database.write(async () => {
        for (let i = 0; i < count; i++) {
          await collection.create(item => {
            item.title = `测试项目 ${Date.now()}-${i}`;
            item.content = `这是第${i+1}条测试数据，创建于${new Date().toLocaleString()}`;
            item.author = '测试脚本';
            item.createdAt = Date.now();
            item.isDeleted = false;
          });
        }
      });
      
      addEvent('success', `成功创建${count}条测试数据`);
      setStatus('测试数据创建完成');
      await countCollectionItems(); // 更新统计
    } catch (error) {
      addEvent('error', `创建测试数据失败: ${error.message}`);
      setStatus('创建测试数据失败');
      console.error('创建数据错误:', error);
    } finally {
      operationInProgress.current = false;
    }
  };
  
  // 测试markAllAsDeleted方法
  const testMarkAllAsDeleted = async () => {
    if (operationInProgress.current) {
      Alert.alert('提示', '操作正在进行中，请稍候');
      return;
    }
    
    try {
      operationInProgress.current = true;
      setStatus('正在执行markAllAsDeleted()方法...');
      addEvent('info', '开始执行markAllAsDeleted()方法标记所有项目为已删除');
      
      const collection = getCollection();
      if (!collection) throw new Error('无法获取集合');
      
      // 执行markAllAsDeleted方法
      await database.write(async () => {
        await collection.query().markAllAsDeleted();
      });
      
      addEvent('success', 'markAllAsDeleted()方法执行成功，所有项目已标记为删除');
      setStatus('markAllAsDeleted执行完成');
      await countCollectionItems(); // 更新统计
    } catch (error) {
      addEvent('error', `markAllAsDeleted执行失败: ${error.message}`);
      setStatus('markAllAsDeleted执行失败');
      console.error('markAllAsDeleted错误:', error);
    } finally {
      operationInProgress.current = false;
    }
  };
  
  // 永久删除已标记的项目 - 修复 where 查询语法
  const purgeDeletedItems = async () => {
    if (operationInProgress.current) {
      Alert.alert('提示', '操作正在进行中，请稍候');
      return;
    }
    
    try {
      operationInProgress.current = true;
      setStatus('正在永久删除已标记的项目...');
      addEvent('info', '开始执行purge删除已标记的项目');
      
      const collection = getCollection();
      if (!collection) throw new Error('无法获取集合');
      
      await database.write(async () => {
        // 关键修复：使用 Q.where() 构建查询条件
        const deletedItems = await collection.query(
          Q.where('isDeleted', '=', true)
        ).fetch();
        for (const item of deletedItems) {
          await item.destroyPermanently();
        }
      });
      
      addEvent('success', '已永久删除所有标记为删除的项目');
      setStatus('永久删除完成');
      await countCollectionItems(); // 更新统计
    } catch (error) {
      addEvent('error', `永久删除失败: ${error.message}`);
      setStatus('永久删除失败');
      console.error('永久删除错误:', error);
    } finally {
      operationInProgress.current = false;
    }
  };
  
  // 清空所有数据
  const clearAllData = async () => {
    Alert.alert(
      '确认',
      '确定要清空该集合的所有数据吗？此操作不可恢复！',
      [
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
                const allItems = await collection.query().fetch();
                for (const item of allItems) {
                  await item.destroyPermanently();
                }
              });
              
              addEvent('success', '已清空集合所有数据');
              setStatus('数据已清空');
              await countCollectionItems(); // 更新统计
            } catch (error) {
              addEvent('error', `清空数据失败: ${error.message}`);
              setStatus('清空数据失败');
              console.error('清空数据错误:', error);
            } finally {
              operationInProgress.current = false;
            }
          }
        }
      ]
    );
  };
  
  // 组件挂载时统计初始数据
  useEffect(() => {
    setStatus('初始化中...');
    countCollectionItems().then(() => {
      setStatus('初始化完成');
    });
    
    // 组件卸载时清理
    return () => {
      operationInProgress.current = false;
    };
  }, [collectionName]);
  
  // 渲染事件日志项
  const renderEvent = (event) => {
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
      default:
        bgColor = '#e3f2fd';
    }
    
    return (
      <View key={event.id} style={[styles.eventItem, { backgroundColor: bgColor }]}>
        <Text style={styles.eventTime}>{event.timestamp}</Text>
        <Text style={styles.eventMessage}>{event.message}</Text>
      </View>
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>WatermelonDB markAllAsDeleted() 测试</Text>
      
      {/* 状态显示 */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>状态: {status}</Text>
      </View>
      
      {/* 集合选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>集合配置</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>集合名称:</Text>
          <TextInput
            style={styles.input}
            value={collectionName}
            onChangeText={setCollectionName}
            placeholder="输入集合名称，例如: articles"
            placeholderTextColor="#999"
          />
        </View>
        
        {/* 数据统计 */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>总项目数: {itemCount}</Text>
          <Text style={styles.statsText}>已标记删除数: {deletedCount}</Text>
          <Text style={styles.statsText}>有效项目数: {itemCount - deletedCount}</Text>
        </View>
        
        <Button 
          title="刷新统计" 
          onPress={countCollectionItems} 
          color="#2196f3" 
        />
      </View>
      
      {/* 测试操作区 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>测试操作</Text>
        
        {/* 关键修改：添加flexWrap和flexDirection确保按钮换行 */}
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
            title="执行 markAllAsDeleted()" 
            onPress={testMarkAllAsDeleted} 
            color="#ff9800" 
          />
          <Button 
            title="永久删除已标记项目" 
            onPress={purgeDeletedItems} 
            color="#f44336" 
          />
        </View>
        
        <View style={styles.singleButtonContainer}>
          <Button 
            title="清空所有数据 (危险操作)" 
            onPress={clearAllData} 
            color="#9c27b0" 
          />
        </View>
      </View>
      
      {/* 事件日志 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>操作日志</Text>
        {events.length === 0 ? (
          <Text style={styles.noEvents}>暂无操作日志，请执行测试操作</Text>
        ) : (
          events.map(renderEvent)
        )}
      </View>
    </ScrollView>
  );
}

// 样式定义
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
  // 关键修改：添加flexWrap: 'wrap' 允许换行，flexDirection: 'row' 横向排列，gap控制间距
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap', // 核心换行属性
    gap: 8, // 按钮之间的间距
    marginBottom: 12, // 与下一组按钮的间距
  },
  // 单个按钮容器，确保宽度100%
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
});
