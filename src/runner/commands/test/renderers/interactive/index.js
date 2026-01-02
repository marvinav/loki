import React from 'react';
import importJsx from 'import-jsx';
import { render } from 'ink';

const App = importJsx('./App.js');

const renderInteractive = (taskRunner) => {
  const { unmount } = render(<App taskRunner={taskRunner} />);
  return unmount;
};

export { renderInteractive };
