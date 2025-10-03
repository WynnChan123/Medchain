import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole } from '../../utils/userRole';

interface UserState {
  role: keyof typeof UserRole | null;
  setRole: (role: keyof typeof UserRole) => void;
  hasHydrated: boolean;
}

const useStore = create<UserState>()(
  persist(
    (set) => ({
      role: "Patient",
      setRole: (role: keyof typeof UserRole) => set({ role }),
      hasHydrated: false,
    }),
    {
      name: 'role',
      onRehydrateStorage: (state) => {
        return () => {
          useStore.setState({ hasHydrated: true });
        };
      }
    }
  )
);

export default useStore;
