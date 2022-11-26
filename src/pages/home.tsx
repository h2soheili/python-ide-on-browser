import React, { Suspense, lazy } from "react";

const Page = lazy(() => import("../components/IDE/App"));

class HomePage extends React.Component {
  state = {
    error: null,
  };
  static getDerivedStateFromError(error) {
    return { error: error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log(error, errorInfo);
  }

  render() {
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  }
}

export default HomePage;
