import { User } from '../types';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onNavigate: (path: string) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ 
  isOpen, 
  onClose,
  user,
  onNavigate
}) => {
  return (
    <div className={`mobile-menu transform transition-transform duration-200 ${
      isOpen ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="p-4 space-y-2">
        <button
          onClick={() => {
            onNavigate('/?step=niches');
            onClose();
          }}
          className="w-full px-4 py-3 text-left text-base font-medium text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2 mobile-button"
        >
          <span>🎯</span>
          Generate Niches
        </button>
        
        {user ? (
          <>
            <button
              onClick={() => {
                onNavigate('/dashboard');
                onClose();
              }}
              className="w-full px-4 py-3 text-left text-base font-medium text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2 mobile-button"
            >
              <span>📊</span>
              Dashboard
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                onNavigate('/');
                onClose();
              }}
              className="w-full px-4 py-3 text-left text-base font-medium text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2 mobile-button"
            >
              <span>👋</span>
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              onNavigate('/');
              onClose();
            }}
            className="w-full px-4 py-3 text-base font-medium gradient-button mobile-button"
          >
            Login / Register
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileMenu; 