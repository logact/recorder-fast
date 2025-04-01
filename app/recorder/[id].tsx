import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import storageService from '../../services/storage/index';
import { TimeRecord } from '../../services/storage/interfaces';


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
   * 初始化根记录
   * 在组件首次加载时创建根记录
   */
  useEffect(() => {
    const initializeRecord = async () => {
      // 直接通过ID加载单条记录
      const existingRecord = await storageService.loadRecord(id);

      if (existingRecord) {
        // 递归更新所有记录的时间
        const updateElapsedTime = (record: TimeRecord): TimeRecord => {
          if (record.isRunning && record.startTime) {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - record.startTime) / 1000);
            return {
              ...record,
              time: record.baseTime + elapsedSeconds,
              children: record.children.map(child => updateElapsedTime(child))
            };
          }
          return {
            ...record,
            children: record.children.map(child => updateElapsedTime(child))
          };
        };

        const updatedRecord = updateElapsedTime(existingRecord);
        setTimeRecords([updatedRecord]);
      } else {
        // 如果找不到记录，返回首页
        router.replace("/recorder/");
      }
    };

    initializeRecord();
  }, [id]);

  /**
   * 更新记录时间
   * 每秒更新所有正在运行的记录的时间
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let lastUpdateTime = Date.now();
    
    const updateTimes = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTime;
      lastUpdateTime = now;

      setTimeRecords(prev => {
        // 递归更新记录树中的时间
        const updateRecordTime = (record: TimeRecord): TimeRecord => {
          if (record.isRunning && record.startTime) {
            const elapsedSeconds = Math.floor((now - record.startTime) / 1000);
            return {
              ...record,
              time: record.baseTime + elapsedSeconds,
              children: record.children.map(child => updateRecordTime(child))
            };
          }
          return {
            ...record,
            children: record.children.map(child => updateRecordTime(child))
          };
        };

        const updatedRecords = prev.map(record => updateRecordTime(record));
        return updatedRecords;
      });
    };

    // 使用 requestAnimationFrame 来实现更平滑的更新
    let animationFrameId: number;
    const animate = () => {
      updateTimes();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  /**
   * 格式化时间的辅助函数
   * 将秒数转换为 "分:秒" 格式，添加平滑过渡效果
   * @param seconds - 需要格式化的秒数
   * @returns 格式化后的时间字符串，例如 "2:05"
   */
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * 切换记录的运行状态
   * 实现了互斥性：同一层级只能有一个记录在运行
   * 父节点的运行状态会影响子节点
   * @param recordId - 要切换状态的记录ID
   */
  const toggleRecord = useCallback(async (recordId: string) => {
    const now = Date.now();

    // 递归更新记录树中的执行状态
    const updateRecordStatus = (records: TimeRecord[]): TimeRecord[] => {
      // 检查是否有目标记录在当前层级
      const hasTargetInLevel = records.some(record => record.id === recordId);
      
      return records.map(record => {
        if (record.id === recordId) {
          // 更新当前记录的状态
          const newIsRunning = !record.isRunning;
          const updatedRecord = {
            ...record,
            isRunning: newIsRunning,
            children: newIsRunning ? record.children : updateChildrenStatus(record.children, false)
          };

          if (newIsRunning) {
            // 开始计时：记录开始时间和基础时间
            updatedRecord.startTime = now;
            updatedRecord.baseTime = record.time || 0;
          } else {
            // 停止计时：更新基础时间，清除开始时间
            const elapsedSeconds = Math.floor((now - (record.startTime || now)) / 1000);
            updatedRecord.baseTime = (record.baseTime || 0) + elapsedSeconds;
            updatedRecord.startTime = undefined;
            updatedRecord.time = updatedRecord.baseTime;
          }
          return updatedRecord;
        } else if (hasTargetInLevel) {
          // 如果目标记录在当前层级，暂停其他同级记录
          return {
            ...record,
            isRunning: false,
            startTime: undefined,
            time: record.baseTime || 0,
            children: updateChildrenStatus(record.children, false)
          };
        } else if (record.children.length > 0) {
          const updatedChildren = updateRecordStatus(record.children);
          // 检查是否是目标记录的父节点
          const targetChild = findRecordById(updatedChildren, recordId);
          if (targetChild) {
            // 如果子节点开始计时，父节点也要开始计时
            return {
              ...record,
              isRunning: targetChild.isRunning,
              startTime: targetChild.isRunning ? now : undefined,
              baseTime: record.time || 0,
              children: updatedChildren
            };
          }
          return {
            ...record,
            children: updatedChildren
          };
        }
        return record;
      });
    };

    // 递归设置所有子记录的状态
    const updateChildrenStatus = (records: TimeRecord[], status: boolean): TimeRecord[] => {
      return records.map(record => ({
        ...record,
        isRunning: status,
        children: updateChildrenStatus(record.children, status)
      }));
    };

    // 查找特定ID的记录
    const findRecordById = (records: TimeRecord[], targetId: string): TimeRecord | null => {
      for (const record of records) {
        if (record.id === targetId) return record;
        if (record.children.length > 0) {
          const found = findRecordById(record.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    // 更新当前显示的记录
    setTimeRecords(prev => {
      const updatedRecords = updateRecordStatus(prev);
      // 直接保存更新后的记录
      storageService.saveRecord(updatedRecords[0]);
      return updatedRecords;
    });
  }, [id]);

  /**
   * 添加新记录
   * 可以添加根记录或子记录
   * @param parentId - 父记录ID，为null时添加根记录
   */
  const addNewRecord = useCallback(async (parentId: string | null) => {
    const newId = Date.now().toString();

    const newRecord: TimeRecord = {
      id: newId,
      time: 0,
      baseTime: 0,  // 初始化基础时间为0
      isRunning: false,
      label: `Recording ${newId}`,
      children: [],
      parentId: parentId,
      isCollapsed: false,
      avatarColor: generateRandomColor(),
      createdAt: new Date(),
      isEditing: false,
      note: '',
      isEditingNote: false,
    };

    // 递归更新记录树中的添加操作
    const updateRecordTree = (records: TimeRecord[]): TimeRecord[] => {
      return records.map(record => {
        if (record.id === parentId) {
          // 找到父记录，添加新的子记录
          return {
            ...record,
            children: [...record.children, newRecord]
          };
        } else if (record.children.length > 0) {
          // 递归检查子记录
          return {
            ...record,
            children: updateRecordTree(record.children)
          };
        }
        return record;
      });
    };

    // 更新当前显示的记录
    setTimeRecords(prev => {
      if (parentId === null) {
        // 如果是添加根记录
        return [...prev, newRecord];
      }
      // 如果是添加子记录
      return updateRecordTree(prev);
    });

    // 如果是添加到根记录，直接保存新记录
    if (parentId === null) {
      await storageService.saveRecord(newRecord);
    } else {
      // 如果是添加子记录，只保存当前记录
      await storageService.saveRecord(timeRecords[0]);
    }
  }, [timeRecords]);

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
      const newRecords = updateCollapse(prev);
      
      // 保存更新后的记录
      storageService.saveRecord(newRecords[0]);
      return newRecords;
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
      const newRecords = updateLabel(prev);
      
      // 保存更新后的记录
      storageService.saveRecord(newRecords[0]);
      return newRecords;
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
  const renderTimeRecord = ({ 
    item,
    depth = 0,
    isLastChild = false 
  }: {
    item: TimeRecord;
    depth?: number;
    isLastChild?: boolean;
  }) => (
    <View key={item.id} style={styles.recordContainer}>
      <View style={[styles.recordItem, { marginLeft: depth * 24 }]}>
        <View style={styles.recordHeader}>
          {/* 折叠按钮移到这里 */}
          {item.children.length > 0 && (
            <TouchableOpacity 
              style={styles.collapseButton}
              onPress={() => toggleCollapse(item.id)}
            >
              <Text style={styles.collapseButtonText}>
                {item.isCollapsed ? '▸' : '▾'}
              </Text>
            </TouchableOpacity>
          )}

          {/* 头像 */}
          <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
            <Text style={styles.avatarText}>
              {item.label ? item.label.charAt(0).toUpperCase() : '#'}
            </Text>
          </View>

          {/* 记录内容 */}
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

            {/* 添加感想部分 */}
            <TouchableOpacity 
              style={styles.noteContainer}
              onPress={() => {
                setTimeRecords(prev => {
                  const updateEditingNote = (records: TimeRecord[]): TimeRecord[] => {
                    return records.map(record => {
                      if (record.id === item.id) {
                        return { ...record, isEditingNote: true };
                      }
                      return {
                        ...record,
                        children: updateEditingNote(record.children)
                      };
                    });
                  };
                  return updateEditingNote(prev);
                });
              }}
            >
              {item.isEditingNote ? (
                <TextInput
                  style={styles.noteInput}
                  value={item.note}
                  onChangeText={(text) => {
                    setTimeRecords(prev => {
                      const updateNote = (records: TimeRecord[]): TimeRecord[] => {
                        return records.map(record => {
                          if (record.id === item.id) {
                            return { ...record, note: text };
                          }
                          return {
                            ...record,
                            children: updateNote(record.children)
                          };
                        });
                      };
                      return updateNote(prev);
                    });
                  }}
                  placeholder="Add your thoughts..."
                  multiline
                  autoFocus
                  blurOnSubmit={true}
                  onBlur={() => {
                    // 创建一个保存并退出编辑状态的函数
                    const saveAndExitEdit = () => {
                      setTimeRecords(prev => {
                        const updateNote = (records: TimeRecord[]): TimeRecord[] => {
                          return records.map(record => {
                            if (record.id === item.id) {
                              return { ...record, isEditingNote: false };
                            }
                            return {
                              ...record,
                              children: updateNote(record.children)
                            };
                          });
                        };
                        const newRecords = updateNote(prev);
                        // 保存更新后的记录
                        storageService.saveRecord(newRecords[0]);
                        return newRecords;
                      });
                    };
                    saveAndExitEdit();
                  }}
                  onSubmitEditing={() => {
                    // 在提交时也调用相同的保存和退出编辑状态的逻辑
                    const saveAndExitEdit = () => {
                      setTimeRecords(prev => {
                        const updateNote = (records: TimeRecord[]): TimeRecord[] => {
                          return records.map(record => {
                            if (record.id === item.id) {
                              return { ...record, isEditingNote: false };
                            }
                            return {
                              ...record,
                              children: updateNote(record.children)
                            };
                          });
                        };
                        const newRecords = updateNote(prev);
                        // 保存更新后的记录
                        storageService.saveRecord(newRecords[0]);
                        return newRecords;
                      });
                    };
                    saveAndExitEdit();
                  }}
                />
              ) : (
                <View style={styles.noteDisplay}>
                  {item.note ? (
                    <Text style={styles.noteText}>{item.note}</Text>
                  ) : (
                    <Text style={styles.notePlaceholder}>Add note...</Text>
                  )}
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
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>

              {/* 添加休息按钮 */}
              <TouchableOpacity 
                style={[styles.addButton, styles.breakButton]}
                onPress={() => {
                  const newId = Date.now().toString();
                  const newRecord: TimeRecord = {
                    id: newId,
                    time: 0,
                    baseTime: 0,  // 初始化基础时间为0
                    isRunning: false,
                    label: 'Break',
                    children: [],
                    parentId: item.id,
                    isCollapsed: false,
                    avatarColor: '#FFB6C1', // 使用柔和的粉色作为休息记录的标识色
                    createdAt: new Date(),
                    isEditing: false,
                    note: '',
                    isEditingNote: false,
                  };

                  setTimeRecords(prev => {
                    const updateRecordTree = (records: TimeRecord[]): TimeRecord[] => {
                      return records.map(record => {
                        if (record.id === item.id) {
                          return {
                            ...record,
                            children: [...record.children, newRecord]
                          };
                        }
                        return {
                          ...record,
                          children: updateRecordTree(record.children)
                        };
                      });
                    };
                    const newRecords = updateRecordTree(prev);
                    // 保存更新后的记录
                    storageService.saveRecord(newRecords[0]);
                    return newRecords;
                  });
                }}
              >
                <Text style={styles.addButtonText}>☕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 子记录列表 */}
      {!item.isCollapsed && item.children.length > 0 && (
        <View style={styles.childrenContainer}>
          {item.children.map((child, index) => 
            renderTimeRecord({
              item: child,
              depth: depth + 1, // 增加子项的深度
              isLastChild: index === item.children.length - 1
            })
          )}
        </View>
      )}
    </View>
  );

  // 修改返回按钮的处理函数
  const handleBack = useCallback(async () => {
    // 保存当前记录状态
    if (timeRecords.length > 0) {
      await storageService.saveRecord(timeRecords[0]);
    }
    router.replace("/recorder/");
  }, [timeRecords]);

  // 渲染主界面
  return (
    <View style={styles.container}>
      {/* 页面头部 */}
      <Stack.Screen
        options={{
          title: 'Voice Recorder',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleBack}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Back</Text>
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
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#2196F3',
    fontSize: 16,
  },

  // 记录列表样式
  recordsList: {
    marginTop: 20,
  },

  // 记录容器样式
  recordContainer: {
    marginBottom: 8,
  },

  // 记录项样式
  recordItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginTop: 8,
  },

  // 更新折叠按钮样式
  collapseButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  collapseButtonText: {
    fontSize: 16,
    color: '#666',
  },

  // 感想相关样式
  noteContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
    minHeight: 60,
    backgroundColor: '#fff',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  noteDisplay: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    minHeight: 40,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
  },
  notePlaceholder: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },

  breakButton: {
    backgroundColor: '#FFF0F5', // 使用柔和的粉色背景
  },
}); 