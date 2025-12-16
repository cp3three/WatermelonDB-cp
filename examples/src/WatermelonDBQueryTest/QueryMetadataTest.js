import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Alert } from 'react-native';
import { Q } from '@react-native-ohos/watermelondb';
import { database } from './database';
import Article from './model';
import { FeaturedArticle } from './model';

export default function QueryMetadataTest() {
  // 状态管理
  const [status, setStatus] = useState('准备就绪');
  const [testResults, setTestResults] = useState([]);
  const [collectionInfo, setCollectionInfo] = useState(null);
  const [queryInfo, setQueryInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const operationInProgress = useRef(false); // 跟踪操作状态

  // 获取集合引用
  const getArticlesCollection = () => {
    return database?.collections?.get('articles') || null;
  };

  // 添加测试结果
  const addTestResult = (testName, result, details = '') => {
    const newResult = {
      id: Date.now(),
      testName,
      result: result ? '✅ 成功' : '❌ 失败',
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [newResult, ...prev]);
  };

  // 通用测试前置检查
  const preTestCheck = () => {
    if (operationInProgress.current) {
      Alert.alert('提示', '操作正在进行中，请稍候');
      return false;
    }
    if (!database) {
      addTestResult('前置检查', false, '数据库实例未初始化');
      return false;
    }
    const collection = getArticlesCollection();
    if (!collection) {
      addTestResult('前置检查', false, '无法获取articles集合');
      return false;
    }
    return true;
  };

  // 测试 modelClass 属性
  const testModelClass = async () => {
    if (!preTestCheck()) return;

    try {
      operationInProgress.current = true;
      setStatus('正在测试 modelClass 属性...');
      
      const collection = getArticlesCollection();
      const query = collection.query();
      const modelClass = query.modelClass;
      
      // 验证modelClass
      const isCorrectClass = modelClass === Article;
      const details = `获取到的modelClass: ${modelClass.name}, 预期: ${Article.name}`;
      addTestResult('测试 modelClass 属性', isCorrectClass, details);
      
      // 验证模型类的table属性
      const tableName = modelClass.table;
      const isCorrectTable = tableName === 'articles';
      addTestResult(
        '测试 modelClass.table 属性', 
        isCorrectTable, 
        `获取到的表名: ${tableName}, 预期: articles`
      );
      
      setStatus('modelClass 属性测试完成');
    } catch (error) {
      addTestResult('测试 modelClass 属性', false, error.message);
      setStatus('modelClass 属性测试失败');
    } finally {
      operationInProgress.current = false;
    }
  };

  // 测试 table 属性
  const testTableProperty = async () => {
    if (!preTestCheck()) return;

    try {
      operationInProgress.current = true;
      setStatus('正在测试 table 属性...');
      
      const collection = getArticlesCollection();
      const query = collection.query();
      const tableName = query.table;
      const isCorrect = tableName === 'articles';
      
      addTestResult(
        '测试 query.table 属性', 
        isCorrect, 
        `获取到的表名: ${tableName}, 预期: articles`
      );
      
      setStatus('table 属性测试完成');
    } catch (error) {
      addTestResult('测试 query.table 属性', false, error.message);
      setStatus('table 属性测试失败');
    } finally {
      operationInProgress.current = false;
    }
  };

  // 测试 secondaryTables 和 allTables
  const testTableLists = async () => {
    if (!preTestCheck()) return;

    try {
      operationInProgress.current = true;
      setStatus('正在测试表列表属性...');
      
      const collection = getArticlesCollection();
      const basicQuery = collection.query();
      const basicSecondaryTables = basicQuery.secondaryTables;
      const basicAllTables = basicQuery.allTables;
      
      addTestResult(
        '测试基础查询的 secondaryTables', 
        basicSecondaryTables.length === 0, 
        `获取到的关联表数量: ${basicSecondaryTables.length}, 预期: 0`
      );
      
      addTestResult(
        '测试基础查询的 allTables', 
        JSON.stringify(basicAllTables) === JSON.stringify(['articles']), 
        `获取到的所有表: ${JSON.stringify(basicAllTables)}, 预期: ["articles"]`
      );

      setStatus('表列表属性测试完成');
    } catch (error) {
      addTestResult('测试表列表属性', false, error.message);
      setStatus('表列表属性测试失败');
    } finally {
      operationInProgress.current = false;
    }
  };

  // 测试 associations 属性
  const testAssociations = async () => {
    if (!preTestCheck()) return;

    try {
      operationInProgress.current = true;
      setStatus('正在测试 associations 属性...');
      
      const collection = getArticlesCollection();
      const query = collection.query();
      const associations = query.associations;
      
      const isCorrect = Array.isArray(associations);
      const details = `关联数量: ${associations.length}, 关联详情: ${JSON.stringify(associations)}`;
      
      addTestResult('测试 associations 属性', isCorrect, details);
      
      setStatus('associations 属性测试完成');
    } catch (error) {
      addTestResult('测试 associations 属性', false, error.message);
      setStatus('associations 属性测试失败');
    } finally {
      operationInProgress.current = false;
    }
  };

  // 运行所有测试
  const runAllTests = async () => {
    if (operationInProgress.current || loading) return;
    
    setLoading(true);
    setStatus('正在执行所有测试...');
    setTestResults([]);
    
    try {
      if (!database) {
        throw new Error('数据库实例未初始化');
      }

      // 依次执行所有测试
      await testModelClass();
      await testTableProperty();
      await testTableLists();
      await testAssociations();
      
      // 收集集合和查询信息
      const collection = getArticlesCollection();
      if (collection) {
        setCollectionInfo({
          name: collection.name,
          modelClassName: collection.modelClass.name,
          isInitialized: !!collection.db
        });

        const sampleQuery = collection.query(Q.where('is_featured', true));
        setQueryInfo({
          table: sampleQuery.table,
          modelClass: sampleQuery.modelClass.name,
          secondaryTables: sampleQuery.secondaryTables,
          allTables: sampleQuery.allTables
        });
      }
      
      setStatus('所有测试执行完成');
      Alert.alert('完成', '所有元数据测试已执行');
    } catch (error) {
      setStatus('测试执行失败');
      addTestResult('整体测试流程', false, error.message);
      console.error('测试执行错误:', error);
    } finally {
      setLoading(false);
      operationInProgress.current = false;
    }
  };

  // 清除测试结果
  const clearResults = () => {
    setTestResults([]);
    setStatus('准备就绪');
    setCollectionInfo(null);
    setQueryInfo(null);
  };

  // 渲染测试结果
  const renderTestResults = () => {
    return testResults.map(result => (
      <View 
        key={result.id} 
        style={[
          styles.resultItem, 
          result.result.includes('成功') ? styles.success : styles.failure
        ]}
      >
        <Text style={styles.resultName}>{result.testName}</Text>
        <Text style={styles.resultStatus}>{result.result}</Text>
        <Text style={styles.resultDetails}>{result.details}</Text>
        <Text style={styles.resultTime}>{result.timestamp}</Text>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Query 元数据方法测试</Text>
        <Text style={styles.status}>{status}</Text>
        
        {/* 测试按钮区域 */}
        <View style={styles.buttonsContainer}>
          <Button 
            title="测试 modelClass" 
            onPress={testModelClass}
            disabled={operationInProgress.current || loading}
          />
          <Button 
            title="测试 table" 
            onPress={testTableProperty}
            disabled={operationInProgress.current || loading}
          />
          <Button 
            title="测试表列表" 
            onPress={testTableLists}
            disabled={operationInProgress.current || loading}
          />
          <Button 
            title="测试 associations" 
            onPress={testAssociations}
            disabled={operationInProgress.current || loading}
          />
          <Button 
            title="运行所有测试" 
            onPress={runAllTests}
            disabled={operationInProgress.current || loading}
            color="#007aff"
          />
          <Button 
            title="清除结果" 
            onPress={clearResults}
            disabled={operationInProgress.current || loading}
            color="#ff6b6b"
          />
        </View>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {testResults.length > 0 ? (
          renderTestResults()
        ) : (
          <Text style={styles.emptyState}>点击上方按钮开始测试...</Text>
        )}
        
        {collectionInfo && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>集合信息</Text>
            <Text>名称: {collectionInfo.name}</Text>
            <Text>模型类: {collectionInfo.modelClassName}</Text>
            <Text>是否初始化: {collectionInfo.isInitialized ? '是' : '否'}</Text>
          </View>
        )}
        
        {queryInfo && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>查询信息</Text>
            <Text>表名: {queryInfo.table}</Text>
            <Text>模型类: {queryInfo.modelClass}</Text>
            <Text>关联表: {JSON.stringify(queryInfo.secondaryTables)}</Text>
            <Text>所有表: {JSON.stringify(queryInfo.allTables)}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  success: {
    backgroundColor: '#e8f5e9',
    borderColor: '#c8e6c9',
  },
  failure: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  resultName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultStatus: {
    fontSize: 14,
    marginBottom: 4,
  },
  resultDetails: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  resultTime: {
    fontSize: 10,
    color: '#888',
    textAlign: 'right',
  },
  emptyState: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  infoCard: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
  },
});