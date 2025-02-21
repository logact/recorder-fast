import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, TouchableOpacity, View, Text, StyleSheet, Alert } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { recorderEvents } from './_layout';
import { router } from 'expo-router';

type Recorder = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  totalTime: string;
};

interface RecorderItemProps {
  item: Recorder;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
}

const RecorderItem: React.FC<RecorderItemProps> = React.memo(({ item, onDelete, onPress }) => {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(70);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      translateX.value = Math.min(0, translateX.value + event.changeX);
    })
    .onEnd(() => {
      const SWIPE_THRESHOLD = -75;
      if (translateX.value < SWIPE_THRESHOLD) {
        translateX.value = withSpring(-100);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd((_event, success) => {
      if (success) {
        'worklet';
        if (translateX.value === 0) {
          runOnJS(onPress)(item.id);
        }
      }
    });

  const composedGestures = Gesture.Simultaneous(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: withSpring(translateX.value < -75 ? 1 : 0),
  }));

  // Optimize text rendering
  const timeContainerStyle = [styles.timeContainer, styles.noFlicker];

  return (
    <GestureDetector gesture={composedGestures}>
      <Animated.View style={[styles.itemContainer]}>
        <Animated.View style={[styles.item, animatedStyle]}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={timeContainerStyle}>
            <Text style={[styles.timeText, styles.noFlicker]}>Start: {item.startTime}</Text>
            <Text style={[styles.timeText, styles.noFlicker]}>End: {item.endTime}</Text>
            <Text style={[styles.totalTime, styles.noFlicker]}>Total: {item.totalTime}</Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.deleteButton, deleteButtonStyle]}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Delete Recorder",
                "Are you sure you want to delete this recorder?",
                [
                  {
                    text: "Cancel",
                    style: "cancel"
                  },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete(item.id)
                  }
                ]
              );
            }}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

const AnimatedText = Animated.createAnimatedComponent(Text);

export default function RecorderListScreen() {
  const [recorders, setRecorders] = useState<Recorder[]>([]);

  useEffect(() => {
    // Listen for new recorder events
    const handleNewRecorder = (newRecorder: Recorder) => {
      setRecorders(current => [newRecorder, ...current]);
    };

    recorderEvents.on('newRecorder', handleNewRecorder);

    // Cleanup listener
    return () => {
      recorderEvents.off('newRecorder', handleNewRecorder);
    };
  }, []);

  const handleRecorderPress = useCallback((id: string) => {
    router.push(`/recorder/${id}`);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setRecorders(current => current.filter(recorder => recorder.id !== id));
  }, []);

  const handleAddRecorder = () => {
    // router.push('/new-recorder');
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <FlatList
        data={recorders}
        renderItem={({ item }) => (
          <RecorderItem
            item={item}
            onDelete={handleDelete}
            onPress={handleRecorderPress}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  itemContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  item: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timeContainer: {
    gap: 4,
    minHeight: 80,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    minWidth: 150,
  },
  totalTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
    minWidth: 150,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F44336',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  deleteText: {
    color: 'white',
    fontWeight: '600',
  },
  headerButton: {
    marginRight: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 28,
  },
  noFlicker: {
    backfaceVisibility: 'hidden',
    transform: [{ perspective: 1000 }],
  },
});