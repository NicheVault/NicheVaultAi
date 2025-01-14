interface NotificationProps {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`glass-card p-4 ${
        type === 'error' ? 'border-red-500/50' : 'border-green-500/50'
      } border flex items-center gap-3 max-w-md shadow-lg`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          type === 'error' ? 'bg-red-500/20' : 'bg-green-500/20'
        }`}>
          {type === 'error' ? '❌' : '✅'}
        </div>
        <p className="text-sm flex-1">{message}</p>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Notification; 