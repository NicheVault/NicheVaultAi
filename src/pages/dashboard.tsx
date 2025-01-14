import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { generatePDFLink } from '../utils/pdfGenerator';
import Footer from '../components/Footer';

interface SavedGuide {
  _id: string;
  niche: string;
  problem: string;
  solution: string;
  isPinned: boolean;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Dashboard() {
  const [savedGuides, setSavedGuides] = useState<SavedGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pinned'>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [selectedGuide, setSelectedGuide] = useState<SavedGuide | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    setUser(JSON.parse(userData));
    fetchSavedGuides(token);
  }, []);

  const fetchSavedGuides = async (token: string) => {
    try {
      const response = await fetch('/api/guides', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setSavedGuides(data.guides);
    } catch (error) {
      console.error('Error fetching guides:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (guideId: string) => {
    setLoadingStates(prev => ({ ...prev, [guideId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/guides', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ guideId })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setSavedGuides(savedGuides.map(guide => 
        guide._id === guideId ? { ...guide, isPinned: !guide.isPinned } : guide
      ));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoadingStates(prev => ({ ...prev, [guideId]: false }));
    }
  };

  const deleteGuide = async (guideId: string) => {
    setLoadingStates(prev => ({ ...prev, [guideId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/guides?id=${guideId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      setSavedGuides(savedGuides.filter(guide => guide._id !== guideId));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoadingStates(prev => ({ ...prev, [guideId]: false }));
    }
  };

  const filteredGuides = activeTab === 'pinned' 
    ? savedGuides.filter(guide => guide.isPinned)
    : savedGuides;

  const handleLogoClick = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col">
      <Head>
        <title>NicheVault - Your Saved Guides</title>
        <meta name="description" content="Access your saved guides and digital product opportunities on NicheVault." />
      </Head>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0F1117]/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">N</span>
            </div>
            <span className="text-xl font-bold">NicheAI</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
          >
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 p-4 space-y-4 bg-[#0F1117] shadow-lg">
            <button
              onClick={() => router.push('/?step=niches')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-all"
            >
              Generate New Niche
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/');
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow bg-[#0F1117] border-r border-white/10 pt-5 overflow-y-auto">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2 px-4 mb-8 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">N</span>
            </div>
            <span className="text-xl font-bold">NicheAI</span>
          </div>
          <nav className="flex-1 px-4 space-y-4">
            <button
              onClick={() => router.push('/?step=niches')}
              className="w-full px-4 py-3 text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2"
            >
              <span>🎯</span>
              Generate New Niche
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/');
              }}
              className="w-full px-4 py-3 text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2"
            >
              <span>👋</span>
              Logout
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6 min-h-[calc(100vh-64px)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Welcome Section */}
              <div className="mb-8 mt-16 md:mt-0 flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-white">Welcome back, {user?.name}!</h1>
                  <p className="mt-2 text-gray-400">Manage your saved guides and explore new niches.</p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <span className="text-white">{user?.name}</span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg bg-[#1A1B23] shadow-lg border border-white/10 animate-fade-in">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            router.push('/');
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'all'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  All Guides
                </button>
                <button
                  onClick={() => setActiveTab('pinned')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'pinned'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Pinned Guides
                </button>
              </div>

              {/* Guides Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card animate-pulse">
                      <div className="h-6 bg-white/10 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
                      <div className="h-4 bg-white/10 rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              ) : filteredGuides.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGuides.map((guide) => (
                    <div key={guide._id} className="glass-card group animate-fade-in">
                      <div className="flex justify-between items-start mb-4">
                        <h3 
                          onClick={() => {
                            setSelectedGuide(guide);
                            setShowGuideModal(true);
                          }}
                          className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors cursor-pointer"
                        >
                          {guide.niche}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => togglePin(guide._id)}
                            disabled={loadingStates[guide._id]}
                            className={`p-2 rounded-lg transition-all ${
                              guide.isPinned ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/5 text-gray-400'
                            } hover:bg-white/10`}
                          >
                            {loadingStates[guide._id] ? (
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              '📌'
                            )}
                          </button>
                          <button
                            onClick={() => deleteGuide(guide._id)}
                            disabled={loadingStates[guide._id]}
                            className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all"
                          >
                            {loadingStates[guide._id] ? (
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              '🗑️'
                            )}
                          </button>
                        </div>
                      </div>
                      <p 
                        onClick={() => {
                          setSelectedGuide(guide);
                          setShowGuideModal(true);
                        }}
                        className="text-gray-400 mb-4 line-clamp-2 group-hover:text-gray-300 transition-colors cursor-pointer"
                      >
                        {guide.problem}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {new Date(guide.createdAt).toLocaleDateString()}
                        </span>
                        {generatePDFLink(guide)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">No guides found</h3>
                  <p className="text-gray-400 mb-8">
                    {activeTab === 'pinned' 
                      ? "You haven't pinned any guides yet" 
                      : "Start by generating and saving some guides"}
                  </p>
                  <button
                    onClick={() => router.push('/?step=niches')}
                    className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg hover:opacity-90 transition-all"
                  >
                    Generate New Guide
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Guide Modal */}
        {showGuideModal && selectedGuide && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A1B23] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedGuide.niche}</h2>
                    <p className="text-gray-400">{selectedGuide.problem}</p>
                  </div>
                  <button
                    onClick={() => setShowGuideModal(false)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="prose prose-invert max-w-none">
                  {selectedGuide.solution.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-300 mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
                  {generatePDFLink(selectedGuide)}
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
} 