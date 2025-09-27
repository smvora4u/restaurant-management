import { ReactNode } from 'react';
import { Container, ContainerProps, useTheme, useMediaQuery } from '@mui/material';

interface ResponsiveContainerProps extends Omit<ContainerProps, 'maxWidth'> {
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  responsiveMaxWidth?: {
    xs?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
    sm?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
    md?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
    lg?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
    xl?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  };
}

export default function ResponsiveContainer({
  children,
  maxWidth = 'lg',
  responsiveMaxWidth,
  ...props
}: ResponsiveContainerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // Determine the appropriate maxWidth based on screen size
  let currentMaxWidth = maxWidth;
  
  if (responsiveMaxWidth) {
    if (isMobile && responsiveMaxWidth.xs !== undefined) {
      currentMaxWidth = responsiveMaxWidth.xs;
    } else if (isTablet && responsiveMaxWidth.sm !== undefined) {
      currentMaxWidth = responsiveMaxWidth.sm;
    } else if (isDesktop && responsiveMaxWidth.lg !== undefined) {
      currentMaxWidth = responsiveMaxWidth.lg;
    } else if (responsiveMaxWidth.md !== undefined) {
      currentMaxWidth = responsiveMaxWidth.md;
    }
  }

  return (
    <Container maxWidth={currentMaxWidth} {...props}>
      {children}
    </Container>
  );
}

// Predefined responsive container configurations
export const ResponsiveContainerConfigs = {
  // Full width on mobile, constrained on larger screens
  adaptive: {
    responsiveMaxWidth: {
      xs: false,
      sm: 'md',
      md: 'lg',
      lg: 'xl',
    },
  },
  // Always constrained but smaller on mobile
  constrained: {
    responsiveMaxWidth: {
      xs: 'sm',
      sm: 'md',
      md: 'lg',
      lg: 'xl',
    },
  },
  // Full width on all screens
  fullWidth: {
    maxWidth: false,
  },
} as const;
