// FetchTestScreen.js（最终修复版，添加安全区适配）
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Button,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Q } from '@react-native-ohos/watermelondb';
import { database, seedTestData } from './database';
import Article, { FeaturedArticle } from './model';

export default function FetchTestScreen() {
  // ===== 1. 状态定义 =====
  // Constructor/extend 测试状态
  const [constructorTestResult, setConstructorTestResult] = useState('');
  const [extendTestResult, setExtendTestResult] = useState('');
  const [testModelId, setTestModelId] = useState('');

  // 原有统计状态
  const [allArticlesCount, setAllArticlesCount] = useState(0);
  const [featuredArticlesCount, setFeaturedArticlesCount] = useState(0);
  const [recentArticlesCount, setRecentArticlesCount] = useState(0);
  const [oldArticlesCount, setOldArticlesCount] = useState(0);
  const [allArticleIds, setAllArticleIds] = useState([]);
  const [featuredArticleIds, setFeaturedArticleIds] = useState([]);
  const [recentArticleIds, setRecentArticleIds] = useState([]);
  const [oldArticleIds, setOldArticleIds] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 新增文章状态
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [customId, setCustomId] = useState('');

  // 原始数据展示模块状态
  const [rawData, setRawData] = useState(null);
  const [isFetchingRaw, setIsFetchingRaw] = useState(false);
  const [rawDataError, setRawDataError] = useState('');

  // then方法测试状态
  const [thenMethodTestResult, setThenMethodTestResult] = useState('');
  const [isTestingThen, setIsTestingThen] = useState(false);

  // ===== 2. 修复：使用useRef存储订阅，避免闭包问题 =====
  const subscriptionsRef = useRef([]);

  // 核心修复：确保 articlesCollection 仅在 database 存在时初始化
  const articlesCollection = useMemo(
    () => database?.collections?.get('articles') || null,
    [database],
  );

  // ===== 3. 原始数据操作方法 =====
  const fetchRawData = useCallback(async () => {
    if (!database || !articlesCollection) {
      Alert.alert('错误', '数据库实例未初始化');
      return;
    }

    setIsFetchingRaw(true);
    setRawDataError('');
    try {
      // 使用官方查询方法获取所有记录
      const allRecords = await articlesCollection
        .query()
        .fetch({ withDeleted: true });
      // 序列化数据（包含原始字段）
      const formattedData = JSON.stringify(
        allRecords.map(record => ({
          id: record.id,
          ...record._raw, // 获取原始数据字段
          _status: record._status, // 包含记录状态（正常/已删除等）
        })),
        null,
        2,
      );
      setRawData(formattedData);
      Alert.alert('成功', '已获取数据库原始数据');
    } catch (error) {
      setRawDataError(`获取失败：${error.message}`);
      console.error('[获取原始数据] 失败:', error);
    } finally {
      setIsFetchingRaw(false);
    }
  }, [database, articlesCollection]);

  const clearRawData = useCallback(() => {
    setRawData(null);
    setRawDataError('');
  }, []);
  // ===== 清空页面操作方法 =====
  const refetchRawData = useCallback(async () => {
    clearRawData();
    await fetchRawData();
  }, [clearRawData, fetchRawData]);

  // ===== 4. Constructor 测试方法 =====
  const testConstructor = useCallback(async () => {
    if (!database) {
      Alert.alert('错误', '数据库实例未初始化');
      return;
    }
    try {
      setConstructorTestResult('测试中...');

      let testArticle;
      await database.write(async () => {
        testArticle = await database.collections
          .get('articles')
          .create(article => {
            article.title = '构造函数测试文章';
            article.author = '测试构造函数';
            article.publishDate = Date.now();
            article.isFeatured = false;
          });
      });

      setTestModelId(testArticle.id);
      const result = `
✅ Constructor测试成功：
- 实例ID：${testArticle.id}
- 标题：${testArticle.title}
- 内容（getter默认值）：${testArticle.contentWithDefault}
- 构造函数日志已输出到控制台
      `;
      setConstructorTestResult(result);
      Alert.alert('成功', 'Constructor测试完成，查看测试结果区域');
    } catch (error) {
      setConstructorTestResult(`❌ 测试失败：${error.message}`);
      console.error('[Constructor测试失败]', error);
    }
  }, [database]);

  // ===== 5. 扩展模型测试方法 =====
  const testExtend = useCallback(async () => {
    if (!database) {
      Alert.alert('错误', '数据库实例未初始化');
      return;
    }
    if (!testModelId) {
      Alert.alert('提示', '请先执行Constructor测试生成测试文章');
      return;
    }

    try {
      setExtendTestResult('测试中...');

      const article = await database.collections
        .get('articles')
        .find(testModelId);
      const featuredArticle = FeaturedArticle.fromArticle(article);

      const result = `
✅ 扩展模型测试成功（ES6类继承）：
- 原始模型摘要：${article.getSummaryWithId()}
- 扩展模型精选摘要：${featuredArticle.getFeaturedSummary()}
- 是否为最新精选：${featuredArticle.isRecentFeatured ? '是' : '否'}
- 扩展模型继承属性：标题=${featuredArticle.title}，作者=${featuredArticle.author}
- 扩展模型默认内容：${featuredArticle.contentWithDefault}
      `;
      setExtendTestResult(result);
      Alert.alert('成功', '扩展模型测试完成，查看测试结果区域');
    } catch (error) {
      setExtendTestResult(`❌ 测试失败：${error.message}`);
      console.error('[Extend测试失败]', error);
    }
  }, [database, testModelId]);

  // ===== 6. 数据订阅和初始化（核心修复）=====
  useEffect(() => {
    let isMounted = true;
    if (!database || !articlesCollection) {
      setLoading(false);
      Alert.alert('错误', '数据库初始化失败');
      return;
    }

    const initSubscriptions = () => {
      // 清除现有订阅
      subscriptionsRef.current.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (e) {
          console.warn('[清理订阅] 失败:', e.message);
        }
      });
      subscriptionsRef.current = [];

      // 全量文章订阅
      const allArticlesQuery = articlesCollection.query();
      const allArticlesSub = allArticlesQuery.observe().subscribe({
        next: list => {
          if (isMounted) {
            setAllArticles(list);
            setAllArticleIds(list.map(item => item.id));
          }
        },
        error: error => console.error('[订阅] 全量数据失败:', error),
      });
      const allCountSub = allArticlesQuery.observeCount().subscribe({
        next: count => isMounted && setAllArticlesCount(count),
        error: error => console.error('[订阅] 全量计数失败:', error),
      });

      // 精选文章订阅
      const featuredQuery = articlesCollection.query(
        Q.where('is_featured', true),
      );
      const featuredSub = featuredQuery.observe().subscribe({
        next: list => {
          if (isMounted) {
            setFeaturedArticles(list);
            setFeaturedArticleIds(list.map(item => item.id));
          }
        },
        error: error => console.error('[订阅] 精选数据失败:', error),
      });
      const featuredCountSub = featuredQuery.observeCount().subscribe({
        next: count => isMounted && setFeaturedArticlesCount(count),
        error: error => console.error('[订阅] 精选计数失败:', error),
      });

      // 最新文章订阅
      const recentQuery = articlesCollection.query(
        Q.sortBy('publish_date', Q.desc),
      );
      const recentSub = recentQuery.observe().subscribe({
        next: list => {
          if (isMounted) {
            setRecentArticles(list);
            setRecentArticleIds(list.map(item => item.id));
          }
        },
        error: error => console.error('[订阅] 最新数据失败:', error),
      });
      const recentCountSub = recentQuery.observeCount().subscribe({
        next: count => isMounted && setRecentArticlesCount(count),
        error: error => console.error('[订阅] 最新计数失败:', error),
      });

      // 30天前旧文章订阅
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const oldQuery = articlesCollection.query(
        Q.where('publish_date', Q.lt(thirtyDaysAgo)),
      );
      const oldSub = oldQuery.observe().subscribe({
        next: list => {
          if (isMounted) setOldArticleIds(list.map(item => item.id));
        },
        error: error => console.error('[订阅] 旧文章数据失败:', error),
      });
      const oldCountSub = oldQuery.observeCount().subscribe({
        next: count => isMounted && setOldArticlesCount(count),
        error: error => console.error('[订阅] 旧文章计数失败:', error),
      });

      // 手动测试 fetchIds
      const fetchIdsManually = async () => {
        try {
          const manualAllIds = await allArticlesQuery.fetchIds();
          const manualFeaturedIds = await featuredQuery.fetchIds();
          const manualOldIds = await oldQuery.fetchIds();
          console.log('[手动测试] fetchIds 结果:', {
            全量ID: manualAllIds,
            精选ID: manualFeaturedIds,
            旧文章ID: manualOldIds,
            全量数量: manualAllIds.length,
            精选数量: manualFeaturedIds.length,
            旧文章数量: manualOldIds.length,
          });
        } catch (error) {
          console.error('[手动测试] fetchIds 失败:', error);
        }
      };
      fetchIdsManually();

      // 存储订阅
      subscriptionsRef.current = [
        allArticlesSub,
        allCountSub,
        featuredSub,
        featuredCountSub,
        recentSub,
        recentCountSub,
        oldSub,
        oldCountSub,
      ];
    };

    const initData = async () => {
      try {
        console.log('[初始化] 开始生成测试数据（鸿蒙版）');
        await seedTestData();
        console.log('[初始化] 测试数据生成完成，开始订阅数据');

        if (isMounted) {
          initSubscriptions();
          setLoading(false);
        }
      } catch (error) {
        console.error('===== 初始化错误详情 =====', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          databaseInstance: !!database,
          collectionExists: !!database?.collections?.get('articles'),
        });
        Alert.alert('错误', `初始化失败：${error.message}`);
        setLoading(false);
      }
    };

    initData();

    // 清理订阅
    return () => {
      isMounted = false;
      subscriptionsRef.current.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (e) {
          console.warn('[清理订阅] 订阅已取消:', e.message);
        }
      });
      subscriptionsRef.current = [];
    };
  }, [articlesCollection, database]);

  // ===== 7. 新增文章方法 =====
  const handleAddArticle = useCallback(async () => {
    if (!newTitle.trim()) {
      Alert.alert('提示', '请输入文章标题');
      return;
    }
    if (!database) {
      Alert.alert('错误', '数据库实例未初始化');
      return;
    }

    setIsAdding(true);
    try {
      await database.write(async () => {
        if (customId.trim()) {
          await articlesCollection.create(article => {
            article.id = customId.trim();
            article.title = newTitle;
            article.content = newContent || '默认内容';
            article.author = '新增用户';
            article.publishDate = Date.now();
            article.isFeatured = false;
          });
        } else {
          await articlesCollection.create(article => {
            article.title = newTitle;
            article.content = newContent || '默认内容';
            article.author = '新增用户';
            article.publishDate = Date.now();
            article.isFeatured = false;
          });
        }
      });

      const freshIds = await articlesCollection.query().fetchIds();
      console.log('[新增文章] fetchIds 更新结果:', freshIds);

      setNewTitle('');
      setNewContent('');
      setCustomId('');
      Alert.alert('成功', '文章添加成功，ID列表已更新');
    } catch (error) {
      console.error('[新增文章] 失败:', error);
      Alert.alert('错误', `添加失败：${error.message}`);
    } finally {
      setIsAdding(false);
    }
  }, [newTitle, newContent, customId, database, articlesCollection]);

  // ===== 8. 切换精选状态方法 =====
  const toggleFeatured = useCallback(
    async article => {
      if (!database) return;
      try {
        await database.write(async () => {
          await article.update(updated => {
            updated.isFeatured = !updated.isFeatured;
          });
        });
        const updatedArticle = await articlesCollection.find(article.id);
        console.log(
          `[更新精选] ID: ${article.id} 状态:`,
          updatedArticle.isFeatured,
        );
      } catch (error) {
        console.error('[更新精选] 失败:', error);
        Alert.alert('错误', '更新文章失败');
      }
    },
    [database, articlesCollection],
  );

  // ===== 9. 删除文章方法 =====
  const deleteArticle = useCallback(
    async id => {
      if (!database) return;
      try {
        await database.write(async () => {
          const article = await articlesCollection.find(id);
          await article.destroyPermanently();
        });
        const remainingIds = await articlesCollection.query().fetchIds();
        console.log('[删除文章] 剩余ID:', remainingIds);
        Alert.alert('成功', `ID: ${id} 的文章已删除`);
      } catch (error) {
        console.error('[删除文章] 失败:', error);
        Alert.alert('错误', '删除文章失败');
      }
    },
    [database, articlesCollection],
  );

  // ===== 10. 重置测试数据方法 =====
  const reloadTestData = useCallback(async () => {
    if (!database) return;
    setLoading(true);
    try {
      await seedTestData();
      Alert.alert('成功', '测试数据已重置');
    } catch (error) {
      console.error('[重置数据] 失败:', error);
      Alert.alert('错误', `重置失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [database]);

  // ===== 11. then方法测试函数 =====
  const testThenMethod = useCallback(async () => {
    if (!database || !articlesCollection) {
      Alert.alert('错误', '数据库实例未初始化');
      return;
    }

    setIsTestingThen(true);
    setThenMethodTestResult('测试中...');

    try {
      // 测试1: 基础查询链then用法
      const baseTestResult = await articlesCollection
        .query()
        .fetch()
        .then(articles => {
          return articles.filter(article => article.isFeatured);
        })
        .then(featuredArticles => {
          return featuredArticles.map(article => article.title);
        });

      // 测试2: 带类型转换的then用法
      const typeTestResult = await articlesCollection
        .query(Q.where('is_featured', true))
        .fetch()
        .then(articles => {
          return articles.map(article => ({
            id: article.id,
            title: article.title,
            isRecent:
              article.publishDate > Date.now() - 30 * 24 * 60 * 60 * 1000,
          }));
        });

      // 测试3: 错误处理测试
      let errorTestResult = '未触发错误';
      try {
        await articlesCollection
          .query()
          .fetch()
          .then(articles => {
            if (articles.length > 0) {
              throw new Error('测试错误: 故意抛出的异常');
            }
            return articles;
          });
      } catch (error) {
        errorTestResult = `捕获到预期错误: ${error.message}`;
      }

      // 整理测试结果
      const result = `
✅ then<U>方法测试成功:

1. 基础链式调用:
   精选文章标题列表: [${baseTestResult.join(', ')}]

2. 类型转换测试:
   转换后对象数量: ${typeTestResult.length}
   第一个对象: { id: "${typeTestResult[0]?.id}", title: "${typeTestResult[0]?.title}", 最新: ${typeTestResult[0]?.isRecent} }

3. 错误处理测试:
   ${errorTestResult}
    `;
      setThenMethodTestResult(result);
      Alert.alert('成功', 'then方法测试完成，查看测试结果区域');
    } catch (error) {
      setThenMethodTestResult(`❌ 测试失败: ${error.message}`);
      console.error('[then方法测试失败]', error);
    } finally {
      setIsTestingThen(false);
    }
  }, [database, articlesCollection]);

  // ===== 12. 格式化ID列表 =====
  const formatIds = ids => {
    if (ids.length === 0) return '无数据';
    if (ids.length <= 3) return ids.join(', ');
    return `${ids.slice(0, 3).join(', ')}... 共${ids.length}个`;
  };

  // ===== 13. 渲染逻辑 =====
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>初始化测试数据...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const InputArea = (
    <View style={styles.operationArea}>
      <Text style={styles.sectionTitle}>添加新文章（支持自定义ID）</Text>
      <TextInput
        style={styles.input}
        placeholder="自定义ID（可选，为空则自动生成）"
        value={customId}
        onChangeText={setCustomId}
        blurOnSubmit={false}
        editable={true}
        retainFocusOnKeyboardHide={true}
      />
      <TextInput
        style={styles.input}
        placeholder="文章标题（必填）"
        value={newTitle}
        onChangeText={setNewTitle}
        blurOnSubmit={false}
        editable={true}
        retainFocusOnKeyboardHide={true}
      />
      <TextInput
        style={[styles.input, styles.contentInput]}
        placeholder="文章内容（可选）"
        value={newContent}
        onChangeText={setNewContent}
        multiline
        blurOnSubmit={false}
        editable={true}
        retainFocusOnKeyboardHide={true}
        scrollEnabled={true}
      />
      <Button
        title={isAdding ? '添加中...' : '添加文章'}
        onPress={handleAddArticle}
        disabled={isAdding}
      />
      <View style={styles.resetButtonWrapper}>
        <Button title="重置测试数据" onPress={reloadTestData} color="#ff6b6b" />
      </View>
    </View>
  );

  const ContentArea = (
    <ScrollView
      style={styles.contentScroll}
      showsVerticalScrollIndicator={true}>
      <Text style={styles.title}>WatermelonDB 全量测试（鸿蒙版）</Text>
      <View style={styles.listContainerInner}>
        {InputArea}

        {/* 计数统计区 */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>计数统计 (fetchCount 测试)</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>总文章数</Text>
              <Text style={styles.statValue}>{allArticlesCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>精选文章数</Text>
              <Text style={styles.statValue}>{featuredArticlesCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>最新文章数</Text>
              <Text style={styles.statValue}>{recentArticlesCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>30天前文章数</Text>
              <Text style={styles.statValue}>{oldArticlesCount}</Text>
            </View>
          </View>
        </View>

        {/* ID列表统计区 */}
        <View style={[styles.statsContainer, styles.idsContainer]}>
          <Text style={styles.statsTitle}>ID列表统计 (fetchIds 测试)</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, styles.idItem]}>
              <Text style={styles.statLabel}>所有文章ID</Text>
              <Text style={styles.idValue}>{formatIds(allArticleIds)}</Text>
            </View>
            <View style={[styles.statItem, styles.idItem]}>
              <Text style={styles.statLabel}>精选文章ID</Text>
              <Text style={styles.idValue}>
                {formatIds(featuredArticleIds)}
              </Text>
            </View>
            <View style={[styles.statItem, styles.idItem]}>
              <Text style={styles.statLabel}>最新文章ID</Text>
              <Text style={styles.idValue}>{formatIds(recentArticleIds)}</Text>
            </View>
            <View style={[styles.statItem, styles.idItem]}>
              <Text style={styles.statLabel}>30天前文章ID</Text>
              <Text style={styles.idValue}>{formatIds(oldArticleIds)}</Text>
            </View>
          </View>
        </View>

        {/* 原始数据展示模块 */}
        <View style={[styles.section, { backgroundColor: '#e8f5e9' }]}>
          <Text style={[styles.sectionTitle, { color: '#2e7d32' }]}>
            0. 数据库原始数据（unsafeFetchRaw）
          </Text>

          <View style={styles.rawDataButtons}>
            <Button
              title={isFetchingRaw ? '获取中...' : '获取原始数据'}
              onPress={fetchRawData}
              disabled={isFetchingRaw}
              color="#2e7d32"
            />
            <Button title="清空页面" onPress={clearRawData} color="#ff8a65" />
            <Button
              title="重新获取"
              onPress={refetchRawData}
              disabled={isFetchingRaw}
              color="#1976d2"
            />
          </View>

          <View style={styles.rawDataDisplay}>
            {isFetchingRaw && (
              <View style={styles.rawDataLoading}>
                <ActivityIndicator size="small" color="#2e7d32" />
                <Text style={styles.rawDataLoadingText}>获取原始数据中...</Text>
              </View>
            )}
            {rawDataError && (
              <Text style={styles.rawDataErrorText}>{rawDataError}</Text>
            )}
            {!isFetchingRaw && !rawDataError && rawData && (
              <ScrollView style={styles.rawDataScroll}>
                <Text style={styles.rawDataText}>{rawData}</Text>
              </ScrollView>
            )}
            {!isFetchingRaw && !rawDataError && !rawData && (
              <Text style={styles.rawDataEmptyText}>
                未获取数据，点击「获取原始数据」按钮加载
              </Text>
            )}
          </View>
        </View>

        {/* 所有文章列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            1. 所有文章（{allArticlesCount}）
          </Text>
          <FlatList
            data={allArticles}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text style={styles.itemId}>ID: {item.id}</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {item.author} · {new Date(item.publishDate).toLocaleString()}
                  {item.isFeatured && (
                    <Text style={styles.featuredBadge}> 精选</Text>
                  )}
                </Text>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => toggleFeatured(item)}>
                    <Text style={styles.actionText}>
                      {item.isFeatured ? '取消精选' : '设为精选'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteArticle(item.id)}>
                    <Text style={styles.deleteText}>删除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            maxHeight={300}
            nestedScrollEnabled={true}
            scrollEnabled={false}
          />
        </View>

        {/* 精选文章列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. 精选文章（{featuredArticlesCount}）
          </Text>
          <FlatList
            data={featuredArticles}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text style={styles.itemId}>ID: {item.id}</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>{item.author}</Text>
              </View>
            )}
            maxHeight={200}
            nestedScrollEnabled={true}
            scrollEnabled={false}
          />
        </View>

        {/* 最新文章列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            3. 最新文章（{recentArticlesCount}）
          </Text>
          <FlatList
            data={recentArticles}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text style={styles.itemId}>ID: {item.id}</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {new Date(item.publishDate).toLocaleString()}
                </Text>
              </View>
            )}
            maxHeight={200}
            nestedScrollEnabled={true}
            scrollEnabled={false}
          />
        </View>

        {/* Constructor/扩展模型测试区 */}
        <View style={[styles.section, { backgroundColor: '#f3e5f5' }]}>
          <Text style={[styles.sectionTitle, { color: '#7b1fa2' }]}>
            4. Constructor/扩展模型测试
          </Text>
          <View style={styles.testButtons}>
            <Button
              title="测试 Constructor 方法"
              onPress={testConstructor}
              color="#7b1fa2"
            />
            <Button title="测试扩展模型" onPress={testExtend} color="#5e35b1" />
          </View>
          <View style={styles.testResultBox}>
            <Text style={styles.testResultTitle}>Constructor 测试结果：</Text>
            <Text style={styles.testResultText}>
              {constructorTestResult || '未执行测试'}
            </Text>
          </View>
          <View style={styles.testResultBox}>
            <Text style={styles.testResultTitle}>扩展模型测试结果：</Text>
            <Text style={styles.testResultText}>
              {extendTestResult || '未执行测试'}
            </Text>
          </View>
        </View>

        {/* then方法测试区 */}
        <View style={[styles.section, { backgroundColor: '#e8eaf6' }]}>
          <Text style={[styles.sectionTitle, { color: '#1a237e' }]}>
            5. then&lt;U&gt; 方法测试
          </Text>
          <View style={styles.testButtons}>
            <Button
              title={isTestingThen ? '测试中...' : '测试then方法'}
              onPress={testThenMethod}
              disabled={isTestingThen}
              color="#3949ab"
            />
          </View>
          <View style={[styles.testResultBox, { borderLeftColor: '#3949ab' }]}>
            <Text style={[styles.testResultTitle, { color: '#1a237e' }]}>
              then方法测试结果：
            </Text>
            <Text style={styles.testResultText}>
              {thenMethodTestResult || '未执行测试'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // 最终渲染
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.mainContainer}>{ContentArea}</View>
    </SafeAreaView>
  );
}

// 样式表
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: StatusBar.currentHeight || 20,
    paddingBottom: 10,
    paddingLeft: 0,
    paddingRight: 0,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
  },
  contentScroll: {
    flex: 1,
  },
  listContainerInner: {
    padding: 16,
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    margin: 14,
    marginTop: 10,
    marginBottom: 0,
  },
  statsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1976d2',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: 100,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  idsContainer: {
    backgroundColor: '#fff3e0',
    height: 400,
  },
  idItem: {
    minHeight: 80,
    justifyContent: 'center',
  },
  idValue: {
    fontSize: 12,
    color: '#e65100',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: '100%',
    flexWrap: 'wrap',
  },
  operationArea: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#444',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  contentInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  resetButtonWrapper: {
    marginTop: 12,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemId: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  itemMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  featuredBadge: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#e3f2fd',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  actionText: {
    fontSize: 12,
    color: '#2196f3',
  },
  deleteText: {
    fontSize: 12,
    color: '#e53935',
  },
  testButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  testResultBox: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7b1fa2',
  },
  testResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#4a148c',
  },
  testResultText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  rawDataButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  rawDataDisplay: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    minHeight: 200,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rawDataLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rawDataLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  rawDataErrorText: {
    color: '#e53935',
    fontSize: 12,
    padding: 8,
  },
  rawDataScroll: {
    flex: 1,
  },
  rawDataText: {
    fontSize: 11,
    color: '#2e7d32',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  rawDataEmptyText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});
