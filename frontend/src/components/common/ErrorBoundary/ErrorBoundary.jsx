import { Component } from 'react';

import Button from '../Button/Button.jsx';
import Icon from '../Icon/Icon.jsx';
import './ErrorBoundary.css';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  handleReset = () => {
    try {
      localStorage.removeItem('greenhaven.cart');
      localStorage.removeItem('greenhaven.wishlist');
    } catch {
      // ignore
    }
    window.location.assign('/');
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="crash">
        <div className="crash__card">
          <span className="crash__mark">
            <Icon name="leaf" size={34} />
          </span>
          <h1>Something went wrong on our side</h1>
          <p>
            This one is ours, not yours. Reloading usually fixes it. If it keeps happening, clearing
            the saved cart and wishlist almost always does.
          </p>

          <div className="crash__actions">
            <Button onClick={() => window.location.reload()} size="lg" icon="arrowRight">
              Reload the page
            </Button>
            <button type="button" className="crash__reset" onClick={this.handleReset}>
              Clear saved data and start again
            </button>
          </div>

          {import.meta.env.DEV && (
            <pre className="crash__detail">{String(this.state.error?.stack || this.state.error)}</pre>
          )}
        </div>
      </div>
    );
  }
}
