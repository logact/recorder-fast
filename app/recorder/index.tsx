import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import storageService, { TimeRecord } from '@/services/storage/index';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';


// 使用与 [id].tsx 相同的 TimeRecord 接口


export default function Home() {
  const router = useRouter();
  const [rootRecords, setRootRecords] = useState<TimeRecord[]>([]);
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Update timer for running records
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 当页面获得焦点时重新加载记录
  useFocusEffect(
    useCallback(() => {
      const loadSavedRecords = async () => {
        const savedRecords = await storageService.loadRecords();
        // Update elapsed time for running records
        const updateElapsedTime = (record: TimeRecord): TimeRecord => {
          if (record.isRunning && record.startTime) {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - record.startTime) / 1000);
            return {
              ...record,
              time: (record.baseTime || 0) + elapsedSeconds,
              baseTime: (record.baseTime || 0) + elapsedSeconds,
              startTime: now
            };
          }
          return record;
        };

        // 更新运行中的记录时间
        const updatedRecords = savedRecords.map(record => updateElapsedTime(record));

        // 对记录进行排序
        const sortedRecords = updatedRecords.sort((a, b) => {
          // 首先按照运行状态排序（正在运行的排在前面）
          if (a.isRunning && !b.isRunning) return -1;
          if (!a.isRunning && b.isRunning) return 1;
          
          // 如果运行状态相同，按照创建时间排序（最新的排在前面）
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setRootRecords(sortedRecords);
      };

      loadSavedRecords();
    }, [])
  );

  // Handle delete record
  const handleDeleteRecord = async (recordId: string) => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // 从存储中删除记录
              await storageService.deleteRecord(recordId);
              
              // 更新本地状态
              setRootRecords(prevRecords => 
                prevRecords.filter(record => record.id !== recordId)
              );
            } catch (error) {
              console.error('Error deleting record:', error);
              Alert.alert(
                "Error",
                "Failed to delete the recording. Please try again."
              );
            }
          }
        }
      ]
    );
  };

  // Render right actions (delete button)
  const renderRightActions = (recordId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteRecord(recordId)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
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

  // 渲染单个记录项
  const renderRecordItem = (record: TimeRecord) => (
    <Swipeable
      key={record.id}
      ref={ref => swipeableRefs.current[record.id] = ref}
      renderRightActions={() => renderRightActions(record.id)}
      onSwipeableOpen={() => {
        // Close other open swipeables
        Object.entries(swipeableRefs.current).forEach(([key, ref]) => {
          if (key !== record.id && ref) {
            ref.close();
          }
        });
      }}
    >
      <TouchableOpacity
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
              <Text style={[
                styles.recordTime,
                record.isRunning && styles.runningTime
              ]}>
                {formatTime(record.isRunning ? (record.baseTime || 0) + Math.floor((currentTime - (record.startTime || currentTime)) / 1000) : record.time || 0)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const handleAddRecorder = async () => {
    const newId = Date.now().toString();
    const existingRecords = await storageService.loadRecords();
    
    // Create new record
    const newRecord = {
      id: newId,
      time: 0,
      isRunning: false,
      label: 'Todo...',
      children: [],
      parentId: null,
      isCollapsed: false,
      avatarColor: generateRandomColor(),
      createdAt: new Date(),
      isEditing: false,
      baseTime: 0
    };
 
    await storageService.saveRecords([...existingRecords, newRecord]);
    
    // Navigate to recorder page
    router.push(`/recorder/${newId}`);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Voice Recorder',
          headerShown: true,
          headerBackVisible: false,
        }}
      />

      {/* Main content area */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.recordsList}>
          {rootRecords.map(record => renderRecordItem(record))}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddRecorder}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </GestureHandlerRootView>
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
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  runningTime: {
    color: '#2196F3', // Blue color for running records
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
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
});