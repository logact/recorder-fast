import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';

/**
 * TimeRecord 接口定义了记录的数据结构
 * 采用树形结构设计，每个记录可以包含多个子记录
 */
interface TimeRecord {
  id: string;          // 记录的唯一标识符，用于操作和更新特定记录
  time: number;        // 记录的计时时间，以秒为单位
  isRunning: boolean;  // 标记当前记录是否正在计时
  label: string;       // 记录的显示标题
  children: TimeRecord[]; // 子记录列表，形成树形结构
  parentId: string | null; // 父记录的ID，根记录为null
  isCollapsed: boolean;   // 控制子记录的显示/隐藏状态
  avatarColor: string;    // 记录图标的背景颜色
  createdAt: Date;        // 记录的创建时间
  isEditing?: boolean;    // 标记是否处于标题编辑状态
}

/**
 * 生成随机颜色的辅助函数
 * 从预定义的颜色数组中随机选择一个颜色
 * 用于新记录的头像背景色
 */
const generateRandomColor = () => {
  const colors = [
    '#FF6B6B', // 红色 - 用于高优先级或重要项目
    '#4ECDC4', // 青色 - 用于一般任务
    '#45B7D1', // 蓝色 - 用于协作项目
    '#96CEB4', // 绿色 - 用于已完成或进行中的任务
    '#FFEEAD', // 黄色 - 用于需要注意的项目
    '#D4A5A5', // 粉色 - 用于个人任务
    '#9B59B6', // 紫色 - 用于创意项目
    '#3498DB'  // 深蓝色 - 用于技术相关任务
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * 记录执行屏幕的主组件
 * 管理计时记录的创建、更新和显示
 */
export default function RecorderExecutionScreen() {
  // 从URL参数中获取记录ID
  const { id } = useLocalSearchParams<{ id: string }>();
  // 使用状态钩子管理记录列表
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);

  /**
   * 格式化时间的辅助函数
   * 将秒数转换为 "分:秒" 格式
   * @param seconds - 需要格式化的秒数
   * @returns 格式化后的时间字符串，例如 "2:05"
   */
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * 初始化根记录
   * 在组件首次加载时创建根记录
   */
  useEffect(() => {
    const mockRootRecord: TimeRecord = {
      id: id,
      time: 0,
      isRunning: false,
      label: `Recording ${id}`,
      children: [],
      parentId: null,
      isCollapsed: false,
      avatarColor: generateRandomColor(),
      createdAt: new Date(),
      isEditing: false,
    };
    setTimeRecords([mockRootRecord]);
  }, [id]);

  /**
   * 设置计时器
   * 每秒更新所有正在运行的记录的时间
   */
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeRecords(prev => updateRunningRecords(prev));
    }, 1000);

    // 清理函数：组件卸载时清除计时器
    return () => clearInterval(intervalId);
  }, []);

  /**
   * 递归更新所有运行中记录的时间
   * @param records - 需要更新的记录数组
   * @returns 更新后的记录数组
   */
  const updateRunningRecords = (records: TimeRecord[]): TimeRecord[] => {
    return records.map(record => ({
      ...record,
      // 如果记录正在运行，增加一秒
      time: record.isRunning ? record.time + 1 : record.time,
      // 递归更新子记录
      children: updateRunningRecords(record.children)
    }));
  };

  /**
   * 切换记录的运行状态
   * 实现了互斥性：同一层级只能有一个记录在运行
   * 父节点的运行状态会影响子节点
   * @param recordId - 要切换状态的记录ID
   */
  const toggleRecord = useCallback((recordId: string) => {
    setTimeRecords(prev => {
      /**
       * 递归更新记录状态
       * @param records - 当前层级的记录数组
       * @returns 更新后的记录数组
       */
      const updateRecord = (records: TimeRecord[]): TimeRecord[] => {
        // 检查目标记录是否在当前层级
        const targetExists = records.some(r => r.id === recordId);
        
        if (targetExists) {
          return records.map(record => {
            if (record.id === recordId) {
              // 切换目标记录的状态
              const newIsRunning = !record.isRunning;
              return {
                ...record,
                isRunning: newIsRunning,
                // 如果停止运行，同时停止所有子记录
                children: !newIsRunning ? 
                  updateDescendants(record.children) : 
                  record.children
              };
            }
            // 停止同级其他记录的运行
            return {
              ...record,
              isRunning: false,
              children: updateDescendants(record.children)
            };
          });
        }
        
        // 如果目标不在当前层级，递归查找
        return records.map(record => {
          const updatedChildren = updateRecord(record.children);
          // 检查是否有运行中的子记录
          const hasRunningDescendant = hasAnyRunningNode(updatedChildren);
          
          return {
            ...record,
            // 如果有运行中的子记录，父记录也要运行
            isRunning: hasRunningDescendant ? true : record.isRunning,
            children: updatedChildren
          };
        });
      };

      /**
       * 更新所有后代节点的状态为停止
       * @param children - 子记录数组
       * @returns 更新后的子记录数组
       */
      const updateDescendants = (children: TimeRecord[]): TimeRecord[] => {
        return children.map(child => ({
          ...child,
          isRunning: false,
          children: updateDescendants(child.children)
        }));
      };

      /**
       * 检查记录树中是否有运行中的节点
       * @param nodes - 要检查的记录数组
       * @returns 是否存在运行中的节点
       */
      const hasAnyRunningNode = (nodes: TimeRecord[]): boolean => {
        return nodes.some(node => 
          node.isRunning || hasAnyRunningNode(node.children)
        );
      };

      return updateRecord(prev);
    });
  }, []);

  /**
   * 添加新记录
   * 可以添加根记录或子记录
   * @param parentId - 父记录ID，为null时添加根记录
   */
  const addNewRecord = useCallback((parentId: string | null) => {
    // 创建新记录对象
    const newRecord: TimeRecord = {
      id: Date.now().toString(), // 使用时间戳作为唯一ID
      time: 0,
      isRunning: false,
      label: '',
      children: [],
      parentId,
      isCollapsed: false,
      avatarColor: generateRandomColor(),
      createdAt: new Date(),
      isEditing: true, // 新记录默认进入编辑状态
    };

    setTimeRecords(prev => {
      // 添加根记录
      if (!parentId) {
        return [...prev, newRecord];
      }

      /**
       * 递归查找父记录并添加子记录
       * @param records - 当前层级的记录数组
       * @returns 更新后的记录数组
       */
      const updateChildren = (records: TimeRecord[]): TimeRecord[] => {
        return records.map(record => {
          if (record.id === parentId) {
            return {
              ...record,
              isCollapsed: false, // 展开父记录
              children: [...record.children, newRecord]
            };
          }
          return {
            ...record,
            children: updateChildren(record.children)
          };
        });
      };

      return updateChildren(prev);
    });
  }, []);

  /**
   * 切换记录的折叠状态
   * @param recordId - 要切换折叠状态的记录ID
   */
  const toggleCollapse = useCallback((recordId: string) => {
    setTimeRecords(prev => {
      const updateCollapse = (records: TimeRecord[]): TimeRecord[] => {
        return records.map(record => {
          if (record.id === recordId) {
            return {
              ...record,
              isCollapsed: !record.isCollapsed,
              children: record.children
            };
          }
          return {
            ...record,
            children: updateCollapse(record.children)
          };
        });
      };
      return updateCollapse(prev);
    });
  }, []);

  /**
   * 更新记录标题
   * @param recordId - 要更新标题的记录ID
   * @param newLabel - 新标题
   */
  const updateRecordLabel = useCallback((recordId: string, newLabel: string) => {
    setTimeRecords(prev => {
      const updateLabel = (records: TimeRecord[]): TimeRecord[] => {
        return records.map(record => {
          if (record.id === recordId) {
            return {
              ...record,
              label: newLabel,
              isEditing: false // 退出编辑状态
            };
          }
          return {
            ...record,
            children: updateLabel(record.children)
          };
        });
      };
      return updateLabel(prev);
    });
  }, []);

  /**
   * 格式化日期
   * @param date - 要格式化的日期对象
   * @returns 格式化后的日期字符串
   */
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * 渲染单个时间记录
   * 包括记录内容和子记录
   */
  const renderTimeRecord = ({ item, depth = 0, isLastChild = false }: { 
    item: TimeRecord; 
    depth?: number;
    isLastChild?: boolean;
  }) => (
    <View key={item.id} style={styles.recordContainer}>
      {/* 连接线和折叠按钮 */}
      <View style={styles.connectionContainer}>
        <View style={styles.horizontalLine} />
        <TouchableOpacity 
          style={styles.collapseButton}
          onPress={() => toggleCollapse(item.id)}
        >
          <Text style={styles.collapseButtonText}>
            {item.isCollapsed ? '+' : '-'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 记录主体内容 */}
      <View style={[styles.recordItem]}>
        <View style={styles.recordHeader}>
          {/* 记录头像 */}
          <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
            <Text style={styles.avatarText}>
              {item.label ? item.label.charAt(0).toUpperCase() : '#'}
            </Text>
          </View>

          {/* 记录详细信息 */}
          <View style={styles.recordContent}>
            {/* 标题部分（可编辑） */}
            <TouchableOpacity 
              onPress={() => {
                setTimeRecords(prev => {
                  const updateEditing = (records: TimeRecord[]): TimeRecord[] => {
                    return records.map(record => {
                      if (record.id === item.id) {
                        return { ...record, isEditing: true };
                      }
                      return {
                        ...record,
                        children: updateEditing(record.children)
                      };
                    });
                  };
                  return updateEditing(prev);
                });
              }}
            >
              {item.isEditing ? (
                <TextInput
                  style={styles.labelInput}
                  value={item.label}
                  onChangeText={(text) => {
                    setTimeRecords(prev => {
                      const updateLabel = (records: TimeRecord[]): TimeRecord[] => {
                        return records.map(record => {
                          if (record.id === item.id) {
                            return { ...record, label: text };
                          }
                          return {
                            ...record,
                            children: updateLabel(record.children)
                          };
                        });
                      };
                      return updateLabel(prev);
                    });
                  }}
                  placeholder="Enter title..."
                  autoFocus
                  onBlur={() => updateRecordLabel(item.id, item.label || `Recording ${item.id}`)}
                />
              ) : (
                <View style={styles.titleRow}>
                  <View style={styles.titleAndDateContainer}>
                    <Text style={styles.recordLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={styles.recordDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.recordTime}>{formatTime(item.time)}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* 操作按钮 */}
            <View style={styles.actionRow}>
              {/* 播放/暂停按钮 */}
              <TouchableOpacity 
                style={[styles.controlButton, item.isRunning && styles.runningButton]}
                onPress={() => toggleRecord(item.id)}
              >
                <View style={styles.controlButtonInner}>
                  {item.isRunning ? (
                    <View style={styles.pauseIcon}>
                      <View style={styles.pauseBar} />
                      <View style={styles.pauseBar} />
                    </View>
                  ) : (
                    <View style={styles.playIcon} />
                  )}
                </View>
              </TouchableOpacity>
              
              {/* 添加子记录按钮 */}
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => addNewRecord(item.id)}
              >
                <Text style={styles.addButtonText}>+ Add Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 子记录列表 */}
      {!item.isCollapsed && item.children.length > 0 && (
        <View style={styles.childrenContainer}>
          <View style={styles.verticalLineContainer}>
            <View style={{height: '100%', width: 1, backgroundColor: 'gray'}} />
          </View>
          {item.children.map((child, index) => 
            renderTimeRecord({
              item: child,
              depth: depth + 1,
              isLastChild: index === item.children.length - 1
            })
          )}
        </View>
      )}
    </View>
  );

  // 渲染主界面
  return (
    <View style={styles.container}>
      {/* 页面头部 */}
      <Stack.Screen
        options={{
          title: 'Nested Timer',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.headerButton}>Back</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* 记录列表滚动区域 */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.content}>
          <View style={styles.recordsList}>
            {timeRecords.map(record => renderTimeRecord({ item: record }))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * 样式定义
 * 使用StyleSheet.create提供更好的性能和类型检查
 */
const styles = StyleSheet.create({
  // 容器相关样式
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },

  // 头部按钮样式
  headerButton: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 16,
  },

  // 记录列表样式
  recordsList: {
    marginTop: 20,
  },

  // 记录容器样式
  recordContainer: {
    position: 'relative',
    marginLeft: 40, // 为连接线留出空间
    marginBottom: 8,
  },

  // 连接线相关样式
  connectionContainer: {
    position: 'absolute',
    left: -40, // 向左偏移到记录外部
    top: 0,
    width: 40,
    height: 40,
    zIndex: 1,
  },
  horizontalLine: {
    position: 'absolute',
    left: 2,    // 从垂直线的中心开始
    right: 0,
    top: 20,    // 垂直居中
    height: 2,
    backgroundColor: '#e0e0e0',
  },
  verticalLineContainer: {
    position: 'absolute',
    left: -39,  // 与水平线对齐
    top: -32,   // 延伸到父节点
    bottom: 0,
    width: 2,
    backgroundColor: '#e0e0e0',
  },

  // 折叠按钮样式
  collapseButton: {
    position: 'absolute',
    left: -6,   // 位于垂直线上
    top: 12,    // 垂直居中
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,  // 确保在线条之上
  },
  collapseButtonText: {
    fontSize: 14,
    lineHeight: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: -1, // 微调文字位置
  },

  // 记录项样式
  recordItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  // 头像样式
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 记录内容样式
  recordContent: {
    flex: 1, // 占据剩余空间
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    marginLeft: 8,
  },

  // 标签输入框样式
  labelInput: {
    fontSize: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fff',
    marginBottom: 8,
  },

  // 操作按钮样式
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  runningButton: {
    backgroundColor: '#e3f2fd', // 运行时的背景色
  },
  controlButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 播放/暂停图标样式
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftColor: '#2196f3',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  pauseIcon: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  pauseBar: {
    width: 3,
    height: 14,
    backgroundColor: '#2196f3',
    borderRadius: 1.5,
  },

  // 添加按钮样式
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  addButtonText: {
    fontSize: 14,
    color: '#666',
  },

  // 子记录容器样式
  childrenContainer: {
    position: 'relative',
    marginTop: -8, // 调整与父记录的间距
  },
}); 