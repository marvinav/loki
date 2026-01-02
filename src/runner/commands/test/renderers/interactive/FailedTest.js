import React from 'react';
import { Box, Text } from 'ink';

const FailedTest = ({ title, error }) => (
  <Box marginLeft={7} flexDirection="column">
    <Text>{title}</Text>
    <Text color="red">{error.message}</Text>
    {Boolean(error.instructions) && <Text dimColor>{error.instructions}</Text>}
  </Box>
);

export default FailedTest;
