import { createContext, useContext } from 'react';

// Whether content is drawn straight onto a background photo (under the dark
// overlay) or onto a normal surface. Screen sets 'image' when it has a
// background and Card resets it to 'default', so text and ghost buttons pick
// a readable colour without every screen passing it down by hand.
export type SurfaceTone = 'default' | 'image';

export const SurfaceToneContext = createContext<SurfaceTone>('default');

export function useSurfaceTone(): SurfaceTone {
  return useContext(SurfaceToneContext);
}
