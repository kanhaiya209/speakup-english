import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import voiceReducer from './voiceSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    voice: voiceReducer,
  },
});

export default store;
