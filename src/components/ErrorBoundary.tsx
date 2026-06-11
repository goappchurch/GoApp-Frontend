import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';

interface State {
  error: Error | null;
  errorInfo: string;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, errorInfo: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ errorInfo: info.componentStack ?? '' });
    console.error('App crashed:', error, info.componentStack);
  }

  handleReload = () => {
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      this.setState({ error: null, errorInfo: '' });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Text style={styles.stack}>{this.state.error.stack}</Text>
          {!!this.state.errorInfo && <Text style={styles.stack}>{this.state.errorInfo}</Text>}
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={this.handleReload}>
          <Text style={styles.buttonText}>Reload App</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: '#DC2626', marginBottom: 12 },
  message: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 16 },
  stack: { fontSize: 11, color: '#555', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, marginBottom: 12 },
  button: {
    margin: 20,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
