import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { registerPushTokenForUser } from '../lib/pushNotifications';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // ユーザー情報を取得
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        set({ user: userData as User, loading: false, initialized: true });
      } else {
        set({ user: null, loading: false, initialized: true });
      }

      // 認証状態の変更を監視
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!error && userData) {
            set({ user: userData as User });
          }

          // ログイン成功時のみ Push Token を取得・保存
          // (INITIAL_SESSION / TOKEN_REFRESHED ではスキップ)
          if (event === 'SIGNED_IN') {
            void registerPushTokenForUser(session.user.id);
          }
        } else {
          set({ user: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, loading: false, initialized: true });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));

