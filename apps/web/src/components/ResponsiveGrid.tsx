import React, { ReactNode } from 'react';
import { Grid, GridProps, useTheme, useMediaQuery, Box } from '@mui/material';

interface ResponsiveGridProps extends Omit<GridProps, 'container' | 'item'> {
  children: ReactNode;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  spacing?: number;
  container?: boolean;
}

export default function ResponsiveGrid({
  children,
  xs,
  sm,
  md,
  lg,
  xl,
  spacing = 2,
  container = true,
  ...props
}: ResponsiveGridProps) {
  // Use default values only if not provided
  const gridXs = xs ?? 12;
  const gridSm = sm ?? 6;
  const gridMd = md ?? 4;
  const gridLg = lg ?? 3;
  const gridXl = xl ?? 2;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Adjust spacing for mobile devices
  const responsiveSpacing = isMobile ? 1 : spacing;

  return (
    <Grid
      container
      spacing={responsiveSpacing}
      sx={{ width: '100%' }}
      {...props}
    >
      {React.Children.map(children, (child, index) => (
        <Grid
          item
          key={index}
          xs={gridXs}
          sm={gridSm}
          md={gridMd}
          lg={gridLg}
          xl={gridXl}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            width: '100%',
            maxWidth: '100%'
          }}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
}

// Predefined responsive grid configurations
export const ResponsiveGridConfigs = {
  // For cards that should be 1 per row on mobile, 2 on tablet, 3 on desktop
  cards: {
    xs: 12,
    sm: 6,
    md: 4,
    lg: 3,
  },
  // For forms that should be 1 per row on mobile, 2 on tablet, 3 on desktop
  forms: {
    xs: 12,
    sm: 6,
    md: 4,
  },
  // For dashboard widgets
  dashboard: {
    xs: 12,
    sm: 6,
    md: 6,
    lg: 4,
  },
  // For full width items
  fullWidth: {
    xs: 12,
  },
} as const;
