import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { View } from 'react-native';

export default function Layout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <Redirect href="/recorder/" />
    </>
  );
}
