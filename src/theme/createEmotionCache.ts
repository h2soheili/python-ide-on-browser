import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import {XDirection} from "../types";


// prepend: true moves MUI styles to the top of the <head> so they're loaded first.
// It allows developers to easily override MUI styles with other styling solutions, like CSS modules.
export function createEmotionCache(dir: XDirection) {
  return createCache({
    key: 'mui' + (dir || 'rtl'),
    prepend: true,
    stylisPlugins: [prefixer, rtlPlugin],
  });
}
