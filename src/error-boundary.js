import React from 'react';
import shiftBridge from '@shift-studio/bridge';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidMount() {
    // Reset canvas error state
    shiftBridge.setCanvasError(false);
  }

  componentDidCatch(error) {
    // Pass error along to handle and set fallback UI
    shiftBridge.setCanvasError(error);
  }

  render() {
    // Only try to render the App if there's no error
    const { children } = this.props; // eslint-disable-line react/prop-types
    return this.state.error ? null : children;
  }
}
