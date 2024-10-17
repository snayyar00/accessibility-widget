import * as React from 'react';
import CircularProgress, { CircularProgressProps } from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

export default function CircularProgressWithLabel(props: CircularProgressProps & { value: number,otherwidget:boolean }) {
  const theme = useTheme();
  const { value,otherwidget } = props;
  const color = value >= 89 ? theme.palette.success.main : theme.palette.error.main;

  // Create a keyframe animation for the CircularProgress
  const progressAnimation = `
    @keyframes circular-rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      {/* Add global styles for animations */}
      <style>{progressAnimation}</style>

      {/* Gray background circle */}
      <CircularProgress
        {...props}
        variant="determinate"
        value={100}
        thickness={1}
        sx={{
          color: theme.palette.grey[300],
          position: 'absolute',
          zIndex: 1,
        }}
      />

      {/* Colored circle representing the score */}
      <CircularProgress
        {...props}
        variant="determinate"
        value={value}
        thickness={4}
        sx={{
          color: otherwidget ? 'orange' : value >= 89 ? theme.palette.success.main : theme.palette.error.main,
          animation: 'circular-rotate 0.5s linear',
          zIndex: 2,
          // Customize the animation here for the value progress bar
          circle: {
            strokeLinecap: 'round',
          },
        }}
      />

      {/* Score value in the center */}
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
        }}
      >
        <Typography
          variant="h4"
          component="div"
          // color={value >= 89 ? 'green' : 'error'}
          sx={{
            color: otherwidget ? 'orange' : value >= 89 ? 'green' : theme.palette.error.main,
            fontWeight: 'bold'
          }}
        >
          {`${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}
