import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

export function useResponsive() {
  const theme = useTheme();
  
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  
  const isMobileOnly = useMediaQuery(theme.breakpoints.only('xs'));
  const isTabletOnly = useMediaQuery(theme.breakpoints.only('sm'));
  const isDesktopOnly = useMediaQuery(theme.breakpoints.only('md'));
  const isLargeDesktopOnly = useMediaQuery(theme.breakpoints.only('lg'));
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    isMobileOnly,
    isTabletOnly,
    isDesktopOnly,
    isLargeDesktopOnly,
    // Helper functions
    isMobileOrTablet: isTablet,
    isDesktopOrLarger: isDesktop,
    // Breakpoint values
    breakpoints: theme.breakpoints.values,
  };
}

export default useResponsive;
