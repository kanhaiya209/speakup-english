import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: localStorage.getItem('speakup_token') || null,
  loading: false,
  error: null,
  onboardingCompleted: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.error = null;
    },
    setToken: (state, action) => {
      state.token = action.payload;
      state.error = null;
      if (action.payload) {
        localStorage.setItem('speakup_token', action.payload);
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setOnboardingCompleted: (state, action) => {
      state.onboardingCompleted = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
      state.onboardingCompleted = false;
      localStorage.removeItem('speakup_token');
    },
  },
});

export const { setUser, setToken, setLoading, setError, setOnboardingCompleted, logout } = authSlice.actions;
export default authSlice.reducer;
