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
import { Database } from '@react-native-ohos/watermelondb';
import SQLiteAdapter from '@react-native-ohos/watermelondb/adapters/sqlite';
import { DatabaseProvider, useDatabase } from '@react-native-ohos/watermelondb/react';
import { mySchema } from './models/schema';
import { dbModels } from './models/index.js';

const adapter = new SQLiteAdapter({
  dbName: 'WatermelonRelationDemo',
  schema: mySchema,
  jsi: false,
  log: (sql) => console.log('SQL执行:', sql),
  onSetUpError: (error) => {
    console.error('[WatermelonDemo*] 初始化数据库失败', error);
  },
});

const database = new Database({
  adapter,
  modelClasses: dbModels,
});

const SAMPLE_MOVIES = [
  {
    title: '星际穿越',
    posterImage:
      'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
    genre: '科幻',
    description: '一段跨越宇宙与时间、寻找新家园的旅程。',
  },
  {
    title: '疯狂动物城',
    posterImage:
      'https://image.tmdb.org/t/p/original/hlK0e0wAQ3VLuJcsfIYPvb4JVud.jpg',
    genre: '动画',
    description: '一只兔子警官与狐狸搭档，揭开阴谋、守护城市。',
  },
  {
    title: '速度与激情 10',
    posterImage:
      'https://image.tmdb.org/t/p/original/qDRGPAcQoW8Wuig9bvoLpHwf1gU.jpg',
    genre: '动作',
    description: '家人永远是第一位，飙车、爆炸、热血永不停歇。',
  },
];

const SAMPLE_REVIEWS = [
  '剧情紧凑，完全停不下来！',
  '配乐太棒了，影院体验绝佳。',
  '主角魅力满分，期待续作。',
  '画面惊艳，值得二刷三刷。',
  '故事内核很温暖，看完心情很好。',
];

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

const MovieCard = ({ movie, onAddReview, onRename, onDelete }) => {
  const [reviews, setReviews] = useState([]);
  const [movieInfo, setMovieInfo] = useState(movie.getMovie());

  useEffect(() => {
    const subscription = movie.reviews.observe().subscribe({
      next: (list) => setReviews(list),
      error: (error) => console.warn('订阅评论失败', error),
    });
    return () => subscription.unsubscribe();
  }, [movie]);

    // 订阅 movie 对象的变化，以便在更新时刷新 UI
    useEffect(() => {
      const subscription = movie.observe().subscribe({
        next: (updatedMovie) => {
          const newInfo = updatedMovie.getMovie();
          console.log('%c watermelondbConsoleLogger movie card updated:', 'color: #0e93e0;background: #aaefe5;', {
            id: updatedMovie.id,
            newTitle: newInfo.title,
          });
          setMovieInfo(newInfo);
        },
        error: (error) => console.warn('订阅电影变化失败', error),
      });
      return () => subscription.unsubscribe();
    }, [movie]);
  
    const info = movieInfo;

  return (
    <View style={styles.card}>
      <Text style={styles.movieTitle}>{info.title}</Text>
      <Text style={styles.movieGenre}>{info.genre}</Text>
      <Text style={styles.movieDesc}>{info.description}</Text>
      <Text style={styles.movieMeta}>上映日期：{formatDate(info.releaseDateAt)}</Text>
      <Text style={styles.movieMeta}>短评：{reviews.length} 条</Text>
      {reviews.slice(0, 2).map((review) => (
        <Text key={review.id} style={styles.reviewItem}>
          · {review.body}
        </Text>
      ))}
      {reviews.length > 2 ? (
        <Text style={styles.reviewItem}>· ……</Text>
      ) : null}
      <View style={styles.cardActions}>
        <ActionButton label="新增短评" onPress={() => onAddReview(movie)} />
        <ActionButton label="随机改名" type="secondary" onPress={() => onRename(movie)} />
        <ActionButton label="删除影片" type="danger" onPress={() => onDelete(movie)} />
      </View>
    </View>
  );
};

const MovieScreen = () => {
  const databaseInstance = useDatabase();
  const moviesCollection = useMemo(
    () => databaseInstance.collections.get('movies'),
    [databaseInstance],
  );

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = moviesCollection.query().observe().subscribe({
      next: (list) => {
        console.log('%c watermelondbConsoleLogger movies list updated:', 'color: #0e93e0;background: #aaefe5;', {
          count: list.length,
          titles: list.map(m => m.title),
        });
        setMovies(list);
        setLoading(false);
      },
      error: (error) => console.error('订阅电影列表失败', error),
    });
    return () => subscription.unsubscribe();
  }, [moviesCollection]);

  const seedDemoData = useCallback(async () => {
    console.log(
      '%c watermelondbConsoleLogger moviesCollection:',
      'color: #0e93e0;background: #aaefe5;',
      moviesCollection,
    );
    const current = await moviesCollection.query().fetch();
    console.log(
      '%c watermelondbConsoleLogger current:',
      'color: #0e93e0;background: #aaefe5;',
      current,
    );
    if (current.length > 0) {
      Alert.alert('提示', '数据库中已经有电影数据，无需重复导入。');
      return;
    }
    await databaseInstance.write(async () => {
      await Promise.all(
        SAMPLE_MOVIES.map((payload, index) =>
          moviesCollection.create((movie) => {
            movie.title = payload.title;
            movie.genre = payload.genre;
            movie.posterImage = payload.posterImage;
            movie.description = payload.description;
            movie.releaseDateAt = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
          }),
        ),
      );
    });
  }, [databaseInstance, moviesCollection]);

  const addRandomMovie = useCallback(async () => {
    const payload = randomItem(SAMPLE_MOVIES);
    await databaseInstance.write(async () => {
      await moviesCollection.create((movie) => {
        movie.title = `${payload.title} · ${Math.floor(Math.random() * 100)}`;
        movie.genre = payload.genre;
        movie.posterImage = payload.posterImage;
        movie.description = payload.description;
        movie.releaseDateAt = new Date();
      });
    });
  }, [databaseInstance, moviesCollection]);

  const addReview = useCallback(
    async (movie) => {
      await databaseInstance.write(async () => {
        await movie.addReview(randomItem(SAMPLE_REVIEWS));
      });
    },
    [databaseInstance],
  );

  const renameMovie = useCallback(
    async (movie) => {
      try {
        console.log('%c watermelondbConsoleLogger renameMovie before:', 'color: #0e93e0;background: #aaefe5;', movie.title);
        await databaseInstance.write(async () => {
          await movie.update((record) => {
            const baseTitle = record.title.split(' · ')[0];
            const newTitle = `${baseTitle} · v${Math.floor(Math.random() * 10 + 1)}`;
            console.log('%c watermelondbConsoleLogger renameMovie updating:', 'color: #0e93e0;background: #aaefe5;', {
              oldTitle: record.title,
              baseTitle,
              newTitle,
            });
            record.title = newTitle;
          });
        });
        console.log('%c watermelondbConsoleLogger renameMovie after:', 'color: #0e93e0;background: #aaefe5;', movie.title);
      } catch (error) {
        console.error('[WatermelonDemo] 随机改名失败', error);
        Alert.alert('错误', `随机改名失败: ${error.message}`);
      }
    },
    [databaseInstance],
  );

  const deleteMovie = useCallback(
    async (movie) => {
      await databaseInstance.write(async () => movie.deleteMovie());
    },
    [databaseInstance],
  );

  const clearAll = useCallback(async () => {
    await databaseInstance.write(async () => {
      const allMovies = await moviesCollection.query().fetch();
      await Promise.all(allMovies.map((movie) => movie.deleteMovie()));
    });
  }, [databaseInstance, moviesCollection]);

  const testRelations = useCallback(async () => {
    try {
      await databaseInstance.write(async () => {
        // 1. 创建测试电影
        const testMovie = await moviesCollection.create(movie => {
          movie.title = '测试电影 - 关联测试';
          movie.genre = '测试';
          movie.description = '用于测试 Movie 与 Review 的关联关系';
          movie.releaseDateAt = new Date();
        });
        console.log('创建测试电影:', testMovie.id);

        // 2. 为测试电影添加评论
        const testReview = await testMovie.addReview('这是一条测试评论');
        console.log('创建测试评论:', testReview.id);

        // 3. 验证关联关系 - 从评论找电影
        const relatedMovie = await testReview.movie.fetch();
        if (relatedMovie.id !== testMovie.id) {
          throw new Error(`评论关联电影失败: 期望 ${testMovie.id}，实际 ${relatedMovie.id}`);
        }

        // 4. 验证关联关系 - 从电影找评论
        const movieReviews = await testMovie.reviews.fetch();
        if (movieReviews.length !== 1 || movieReviews[0].id !== testReview.id) {
          throw new Error(`电影关联评论失败: 期望 1 条评论，实际 ${movieReviews.length} 条`);
        }

        // 5. 清理测试数据
        await testMovie.deleteMovie();
        
        Alert.alert('测试成功', 'Movie 与 Review 关联关系验证通过');
      });
    } catch (error) {
      console.error('关联测试失败:', error);
      Alert.alert('测试失败', `关联关系验证出错: ${error.message}`);
    }
  }, [databaseInstance, moviesCollection]);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>WatermelonDB 示例</Text>
        <View style={styles.actionRow}>
          <ActionButton label="导入示例电影" onPress={seedDemoData} />
          <ActionButton label="随机新增" type="secondary" onPress={addRandomMovie} />
          <ActionButton label="清空所有" type="danger" onPress={clearAll} />
          <ActionButton label="测试关联关系" type="secondary" onPress={testRelations} />
        </View>
        <Text style={styles.countText}>当前共有 {movies.length} 部电影</Text>
        {loading ? (
          <Text style={styles.loadingText}>正在加载数据...</Text>
        ) : movies.length === 0 ? (
          <Text style={styles.loadingText}>暂无电影，请先导入示例数据。</Text>
        ) : (
          movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onAddReview={addReview}
              onRename={renameMovie}
              onDelete={deleteMovie}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default function WatermelonRelaDemo() {
  console.log('%c watermelondbConsoleLogger WatermelonDemo:', 'color: #0e93e0;background: #aaefe5;', 'WatermelonDemo');
  return (
    <DatabaseProvider database={database}>
      <MovieScreen />
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
  reviewItem: {
    color: '#c5c9d3',
    marginTop: 4,
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
});
