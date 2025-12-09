import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

import { mockDatabaseSchema } from './models/schema';
const mockDatabase = () => ({
  db: {
    schema: mockDatabaseSchema,
  },
});
const MockProject = { table: 'mock_projects' };
const MockTask = { table: 'mock_tasks' };
// class Model {}
import CollectionMap from '@react-native-ohos/watermelondb/Database/CollectionMap';
import Model from '@react-native-ohos/watermelondb/Model';

// 核心测试页面
const CollectionMapTestPage = () => {
  // 状态管理
  const [db, setDb] = useState(null);
  const [map, setMap] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [activeTab, setActiveTab] = useState('test');

  // 初始化测试环境
  useEffect(() => {
    try {
      const mockDb = mockDatabase();
      setDb(mockDb.db);
      initCollectionMap(mockDb.db);
    } catch (e) {
      addTestResult(`❌ 测试环境初始化失败: ${e.message}`);
    }
  }, []);

  // 初始化 CollectionMap
  const initCollectionMap = (database) => {
    try {
      const collectionMap = new CollectionMap(database, [MockProject, MockTask]);
      setMap(collectionMap);
      addTestResult("✅ CollectionMap 初始化成功");
    } catch (e) {
      addTestResult(`❌ CollectionMap 初始化失败: ${e.message}`);
    }
  };

  // 添加测试结果
  const addTestResult = (result) => {
    setTestResults(prev => [...prev, result]);
  };

  // 清空测试结果
  const clearResults = () => {
    setTestResults([]);
    if (db) initCollectionMap(db);
  };

  // 测试1：获取有效集合
  const testValidCollections = () => {
    if (!map) {
      addTestResult("❌ 未初始化 CollectionMap，跳过测试");
      return;
    }
    try {
      const projects = map.get('mock_projects');
      const tasks = map.get('mock_tasks');
      if (projects && projects.modelClass === MockProject) {
        addTestResult("✅ 正确获取 mock_projects 集合");
      } else {
        addTestResult("❌ mock_projects 集合验证失败");
      }
      if (tasks && tasks.modelClass === MockTask) {
        addTestResult("✅ 正确获取 mock_tasks 集合");
      } else {
        addTestResult("❌ mock_tasks 集合验证失败");
      }
    } catch (e) {
      addTestResult(`❌ 获取有效集合出错: ${e.message}`);
    }
  };

  // 测试2：获取不存在的集合
  const testNonExistentCollections = () => {
    if (!map) {
      addTestResult("❌ 未初始化 CollectionMap，跳过测试");
      return;
    }
    try {
      const comments = map.get('mock_comments');
      const unknown = map.get('does_not_exist');
      if (comments === null && unknown === null) {
        addTestResult("✅ 不存在的集合返回 null");
      } else {
        addTestResult("❌ 不存在的集合处理错误");
      }
    } catch (e) {
      addTestResult(`❌ 测试不存在集合出错: ${e.message}`);
    }
  };

  // 测试3：非法表名处理
  const testInvalidTableNames = () => {
    if (!map) {
      addTestResult("❌ 未初始化 CollectionMap，跳过测试");
      return;
    }
    try {
      const testCases = [null, 0, 123, '__proto__', 'hasOwnProperty'];
      const results = testCases.map(item => map.get(item) === null);
      if (results.every(res => res)) {
        addTestResult("✅ 非法表名正确返回 null");
      } else {
        addTestResult("❌ 非法表名处理错误");
      }
    } catch (e) {
      addTestResult(`❌ 测试非法表名出错: ${e.message}`);
    }
  };

  // 测试4：映射不可修改性
  const testImmutability = () => {
    if (!map) {
      addTestResult("❌ 未初始化 CollectionMap，跳过测试");
      return;
    }
    try {
      const originalMap = map.map;
      let errorThrown = false;
      // 核心：开启严格模式（局部生效）
      (function() {
        'use strict';
        try {
          map.map.newTable = 'test'; // 严格模式下，不可扩展对象新增属性会抛TypeError
        } catch (e) {
          errorThrown = true;
        }
      })();
      // 同时校验：属性没被新增 + 引用没变化
      const hasNewProperty = 'newTable' in map.map;
      if (errorThrown && !hasNewProperty && map.map === originalMap) {
        addTestResult("✅ 集合映射保持不可修改");
      } else {
        addTestResult("❌ 集合映射被意外修改");
      }
    } catch (e) {
      addTestResult(`❌ 测试不可修改性出错: ${e.message}`);
    }
  };

  // 测试5：无效模型校验
  const testInvalidModels = () => {
    if (!db) {
      addTestResult("❌ 未初始化数据库，跳过测试");
      return;
    }
    try {
      // 表名不在schema的模型
      class BadModel2 extends Model {
        static table = 'unknown_table';
      }
      let error1Thrown = false;
      try {
        new CollectionMap(db, [BadModel2]);
      } catch (e) {
        error1Thrown = e.message.includes('missing in schema');
      }
      if (error1Thrown) {
        addTestResult("✅ 无效模型类校验通过");
      } else {
        addTestResult("❌ 无效模型类未被正确校验");
      }
    } catch (e) {
      addTestResult(`❌ 测试无效模型出错: ${e.message}`);
    }
  };

  // 样式定义
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    header: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    headerText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    tabItem: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: '#007AFF',
    },
    tabText: {
      fontSize: 16,
      color: '#333',
    },
    tabTextActive: {
      color: '#007AFF',
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    testButton: {
      flex: 1,
      minWidth: '45%',
      padding: 12,
      backgroundColor: '#007AFF',
      borderRadius: 8,
      alignItems: 'center',
    },
    clearButton: {
      backgroundColor: '#FF3B30',
    },
    buttonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
    },
    resultItem: {
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    resultText: {
      fontSize: 14,
      lineHeight: 20,
    },
    emptyText: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginTop: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* 页面标题 */}
      <View style={styles.header}>
        <Text style={styles.headerText}>CollectionMap 测试工具</Text>
      </View>

      {/* 标签栏 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'test' && styles.tabActive]}
          onPress={() => setActiveTab('test')}
        >
          <Text style={[styles.tabText, activeTab === 'test' && styles.tabTextActive]}>
            功能测试
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'result' && styles.tabActive]}
          onPress={() => setActiveTab('result')}
        >
          <Text style={[styles.tabText, activeTab === 'result' && styles.tabTextActive]}>
            测试结果
          </Text>
        </TouchableOpacity>
      </View>

      {/* 测试功能区 */}
      {activeTab === 'test' && (
        <ScrollView style={styles.content}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.testButton} onPress={testValidCollections}>
              <Text style={styles.buttonText}>测试有效集合获取</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={testNonExistentCollections}>
              <Text style={styles.buttonText}>测试不存在集合</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.testButton} onPress={testInvalidTableNames}>
              <Text style={styles.buttonText}>测试非法表名</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={testImmutability}>
              <Text style={styles.buttonText}>测试不可修改性</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.testButton} onPress={testInvalidModels}>
              <Text style={styles.buttonText}>测试无效模型校验</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.testButton, styles.clearButton]} onPress={clearResults}>
              <Text style={styles.buttonText}>清空结果</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 测试结果区 */}
      {activeTab === 'result' && (
        <ScrollView style={styles.content}>
          {testResults.length === 0 ? (
            <Text style={styles.emptyText}>请点击上方按钮执行测试</Text>
          ) : (
            testResults.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <Text
                  style={[
                    styles.resultText,
                    { color: result.startsWith('✅') ? '#34C759' : '#FF3B30' },
                  ]}
                >
                  {result}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// 导出页面组件（可直接在路由中注册）
export default CollectionMapTestPage;