import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import StorageService from '@/services/storage/index';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Create a global event emitter for refreshing the list
import { EventEmitter } from 'events';
export const recorderEvents = new EventEmitter();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const handleAddRecorder = async () => {
    const newId = Date.now().toString();
    const existingRecords = await StorageService.loadRecords();
    
    // Create new record
    const newRecord = {
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
      baseTime: 0
    };
 
    await StorageService.saveRecords([...existingRecords, newRecord]);
    
    // Navigate to recorder page
    router.push(`/recorder/${newId}`);
  };

  const generateRandomColor = () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Voice Recorder',
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleAddRecorder}
            >
              <Text style={styles.headerButtonText}>+</Text>
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginRight: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 28,
  },
});
