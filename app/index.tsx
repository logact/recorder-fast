import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storage';

// 使用与 [id].tsx 相同的 TimeRecord 接口
interface TimeRecord {
  id: string;
  time: number;
  isRunning: boolean;
  label: string;
  children: TimeRecord[];
  parentId: string | null;
  isCollapsed: boolean;
  avatarColor: string;
  createdAt: Date;
  isEditing?: boolean;
}

export default function Home() {
  const router = useRouter();
  const [rootRecords, setRootRecords] = useState<TimeRecord[]>([]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化日期
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 当页面获得焦点时重新加载记录
  useFocusEffect(
    useCallback(() => {
      const loadSavedRecords = async () => {
        const savedRecords = await StorageService.loadRecords();
        setRootRecords(savedRecords);
      };

      loadSavedRecords();
    }, [])
  );

  // 渲染单个记录项
  const renderRecordItem = (record: TimeRecord) => (
    <TouchableOpacity
      key={record.id}
      style={styles.recordItem}
      onPress={() => router.push(`/recorder/${record.id}`)}
    >
      {/* 记录头部 */}
      <View style={styles.recordHeader}>
        {/* 头像 */}
        <View style={[styles.avatar, { backgroundColor: record.avatarColor }]}>
          <Text style={styles.avatarText}>
            {record.label ? record.label.charAt(0).toUpperCase() : '#'}
          </Text>
        </View>

        {/* 记录内容 */}
        <View style={styles.recordContent}>
          <View style={styles.titleRow}>
            <View style={styles.titleAndDateContainer}>
              <Text style={styles.recordLabel} numberOfLines={1}>
                {record.label}
              </Text>
              <Text style={styles.recordDate}>
                {formatDate(record.createdAt)}
              </Text>
            </View>
            <Text style={styles.recordTime}>
              {formatTime(record.time)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // 添加新记录
  const handleAddNewRecord = async () => {
    const newId = Date.now().toString();
    const existingRecords = await StorageService.loadRecords();
    
    // 创建新记录
    const newRecord: TimeRecord = {
      id: newId,
      time: 0,
      isRunning: false,
      label: `Recording ${newId}`,
      children: [],
      parentId: null,
      isCollapsed: false,
      avatarColor: generateRandomColor(),
      createdAt: new Date(),
      isEditing: false,
    };

    // 保存新记录
    await StorageService.saveRecords([...existingRecords, newRecord]);
    
    // 导航到记录器页面
    router.push(`/recorder/${newId}`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Voice Recorder',
          headerShown: true,
          headerBackVisible: false,
        }}
      />

      {/* 主要内容区域 */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.recordsList}>
          {rootRecords.map(record => renderRecordItem(record))}
        </View>
      </ScrollView>

      {/* 居中的添加按钮 */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleAddNewRecord}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const generateRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100, // 为底部按钮留出空间
  },
  recordsList: {
    gap: 12,
  },
  recordItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleAndDateContainer: {
    flex: 1,
    marginRight: 8,
  },
  recordLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#666',
  },
  recordTime: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});