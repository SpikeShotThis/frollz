import { store } from 'quasar/wrappers';
import { pinia } from './pinia.js';

export default store(() => {
  return pinia;
});
