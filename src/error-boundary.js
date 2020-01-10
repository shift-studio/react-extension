import React from 'react';
import clutchBridge from '@clutch-creator/bridge';

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
    clutchBridge.setCanvasError(false);
  }

  componentDidCatch(error) {
    // Pass error along to handle and set fallback UI
    clutchBridge.setCanvasError(error);
  }

  render() {
    // Only try to render the App if there's no error
    const { children } = this.props; // eslint-disable-line react/prop-types
    return this.state.error ? null : children;
  }
}
