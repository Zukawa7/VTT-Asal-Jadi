export type OverlayPosition = 'top' | 'bottom' | 'center';
export type OverlayAnimation = 'slide' | 'fade' | 'bounce';
export type OverlayFontSize = 'small' | 'medium' | 'large';

export interface OverlayConfig {
  position: OverlayPosition;
  animationStyle: OverlayAnimation;
  fontSize: OverlayFontSize;
  showFormula: boolean;
  autoHideTimeout: number;
  soundEffectsEnabled: boolean;
}

export const defaultOverlayConfig: OverlayConfig = {
  position: 'bottom',
  animationStyle: 'slide',
  fontSize: 'medium',
  showFormula: true,
  autoHideTimeout: 10,
  soundEffectsEnabled: false,
};
