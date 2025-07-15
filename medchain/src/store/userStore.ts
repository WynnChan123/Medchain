import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserRole = 'Patient' | 'HealthcareProvider' | 'Insurer' | 'Admin';

interface UserState {
  role: UserRole;
  setRole: (role: UserRole) => void;
  hasHydrated: boolean;
}

const useStore = create<UserState>()(
  persist(
    (set) => ({
      role: 'Patient',
      setRole: (role: UserRole) => set({ role }),
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
