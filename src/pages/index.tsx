import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { NicheOption, ProblemOption } from '../types';
import { generatePDFLink } from '../utils/pdfGenerator';
import Footer from '../components/Footer';

interface User {
  id: string;
  name: string;
  email: string;
}

interface SavedGuide {
  _id: string;
  niche: string;
  problem: string;
  solution: string;
  isPinned: boolean;
  createdAt: string;
}

interface FormattedSection {
  type: 'heading' | 'bold' | 'italic' | 'list' | 'paragraph';
  content: string | string[];
}

// Add type guard function
const isStringArray = (content: string | string[]): content is string[] => {
  return Array.isArray(content);
};

export default function Home() {
  const [step, setStep] = useState<'start' | 'niches' | 'problems' | 'solution'>('start');
  const [categories, setCategories] = useState<string[]>([]);
  const [niches, setNiches] = useState<NicheOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [problems, setProblems] = useState<ProblemOption[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<string>('');
  const [solution, setSolution] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [savedGuides, setSavedGuides] = useState<SavedGuide[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });
  const router = useRouter();

  // Add new state for expanded content
  const [expandedSolution, setExpandedSolution] = useState(false);
  const [expandingContent, setExpandingContent] = useState(false);

  // Add mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [initialNiches, setInitialNiches] = useState<NicheOption[]>([]);
  const [hasGeneratedNew, setHasGeneratedNew] = useState(false);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Add new state for notifications
  const [notification, setNotification] = useState<{
    message: string;
    type: 'error' | 'success';
    show: boolean;
  }>();

  // Add notification helper function
  const showNotification = (message: string, type: 'error' | 'success') => {
    setNotification({ message, type, show: true });
    setTimeout(() => setNotification(prev => ({ ...prev!, show: false })), 3000);
  };

  const handleLogoClick = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      setStep('start');
    }
  };

  useEffect(() => {
    // Check for saved token and redirect to niches if logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      setStep('niches'); // Automatically go to niches page when logged in
    }
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
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setShowAuthModal(false);
        fetchSavedGuides(data.token);
      }
    } catch (error: any) {
      showNotification(error.message, 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSavedGuides([]);
  };

  const saveGuide = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          niche: selectedNiche,
          problem: selectedProblem,
          solution
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setSavedGuides([...savedGuides, data.guide]);
      showNotification('Guide saved successfully!', 'success');
    } catch (error: any) {
      showNotification(error.message, 'error');
    }
  };

  const togglePin = async (guideId: string) => {
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
      showNotification(error.message, 'error');
    }
  };

  const deleteGuide = async (guideId: string) => {
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
      showNotification(error.message, 'error');
    }
  };

  useEffect(() => {
    // Load initial niches when component mounts
    const loadInitialNiches = async () => {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getNiches' })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch initial niches');
        }

        setCategories(data.categories || []);
        setInitialNiches(data.niches || []);
        setNiches(data.niches || []);
      } catch (error: any) {
        console.error('Error fetching initial niches:', error);
      }
    };

    loadInitialNiches();
  }, []);

  const getNiches = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'getNiches',
          excludeNiches: initialNiches.map(n => n.name)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch niches');
      }

      setCategories(data.categories || []);
      setNiches(hasGeneratedNew ? [...niches, ...data.niches] : data.niches || []);
      setHasGeneratedNew(true);
      setStep('niches');
    } catch (error: any) {
      console.error('Error fetching niches:', error);
      showNotification(error.message || 'An error occurred while fetching niches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getProblems = async (niche: string) => {
    setLoading(true);
    setSelectedNiche(niche);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getProblems', niche })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch problems');
      }

      setProblems(data.problems);
      setStep('problems');
    } catch (error: any) {
      showNotification(error.message || 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatSolution = (text: string): FormattedSection[] => {
    // First, clean up HTML tags while preserving content
    const cleanText = text
      .replace(/<h[1-6]>(.*?)<\/h[1-6]>/g, '# $1') // Convert header tags to markdown style
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**') // Convert strong/bold tags
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '_$1_') // Convert emphasis/italic tags
      .replace(/<i>(.*?)<\/i>/g, '_$1_')
      .replace(/<ul>(.*?)<\/ul>/g, (_, list) => list) // Remove ul tags but keep content
      .replace(/<li>(.*?)<\/li>/g, '- $1\n') // Convert list items to markdown style
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n') // Convert paragraphs
      .replace(/<br\s*\/?>/g, '\n') // Convert line breaks
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/&nbsp;/g, ' ') // Replace HTML spaces
      .replace(/&amp;/g, '&') // Replace HTML ampersand
      .replace(/&lt;/g, '<') // Replace HTML less than
      .replace(/&gt;/g, '>') // Replace HTML greater than
      .trim();
    
    // Split into sections and format
    return cleanText.split('\n\n').filter(section => section.trim() !== '').map(section => {
      // Format headings
      if (section.startsWith('#')) {
        return {
          type: 'heading',
          content: section.replace(/^#+ /, '').trim()
        };
      }
      // Format bold text
      if (section.includes('**')) {
        return {
          type: 'bold',
          content: section.replace(/\*\*/g, '').trim()
        };
      }
      // Format italic text
      if (section.includes('_')) {
        return {
          type: 'italic',
          content: section.replace(/_/g, '').trim()
        };
      }
      // Format lists
      if (section.includes('- ')) {
        return {
          type: 'list',
          content: section.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => line.replace(/^- /, '').trim())
        };
      }
      // Regular paragraphs
      return {
        type: 'paragraph',
        content: section.trim()
      };
    });
  };

  const expandSolution = async () => {
    setExpandingContent(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'expandSolution',
          niche: selectedNiche,
          problem: selectedProblem,
          currentSolution: solution
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSolution(solution + '\n\n' + data.additionalContent);
      setExpandedSolution(true);
    } catch (error: any) {
      showNotification(error.message, 'error');
    } finally {
      setExpandingContent(false);
    }
  };

  const getMoreProblems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getMoreProblems',
          niche: selectedNiche,
          currentProblems: problems
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setProblems([...problems, ...data.problems]);
    } catch (error: any) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSolution = async (problem: string) => {
    setLoading(true);
    setSelectedProblem(problem);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getSolution',
          niche: selectedNiche,
          problem
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate solution');

      setSolution(data.solution.replace(/<[^>]*>/g, ''));
      setStep('solution');
    } catch (error: any) {
      showNotification(error.message || 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add loading animation for niche cards
  const NicheCard = ({ niche, onClick }: { niche: NicheOption; onClick: () => void }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        className={`glass-card cursor-pointer transform transition-all duration-300 ${
          isHovered ? 'scale-[1.02] shadow-lg' : ''
        } hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] group animate-scale-in`}
      >
        <div className="relative overflow-hidden rounded-lg">
          <div className={`absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          <h3 className="text-lg font-semibold mb-2 group-hover:text-purple-300 transition-colors">
            {niche.name}
          </h3>
          <p className="text-gray-400 mb-4 group-hover:text-gray-300 transition-colors">
            {niche.description}
          </p>
          <div className="flex justify-between items-center">
            <span className="px-3 py-1 bg-purple-500/20 rounded-full text-sm group-hover:bg-purple-500/30 transition-all">
              {niche.category}
            </span>
            <span className="text-yellow-400 group-hover:text-yellow-300 transition-colors">
              {niche.potential}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Add loading animation for problem cards
  const ProblemCard = ({ problem, onClick }: { problem: ProblemOption; onClick: () => void }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        className={`glass-card cursor-pointer transform transition-all duration-300 ${
          isHovered ? 'scale-[1.02] shadow-lg' : ''
        } hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] group animate-slide-up`}
      >
        <div className="relative overflow-hidden rounded-lg">
          <div className={`absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold group-hover:text-purple-300 transition-colors">
              {problem.title}
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm transition-all ${
              problem.severity === 'High' ? 'bg-red-500/20 text-red-300 group-hover:bg-red-500/30' :
              problem.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 group-hover:bg-yellow-500/30' :
              'bg-green-500/20 text-green-300 group-hover:bg-green-500/30'
            }`}>
              {problem.severity} Priority
            </span>
          </div>
          <p className="text-gray-400 mb-4 group-hover:text-gray-300 transition-colors">
            {problem.description}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white/5 group-hover:bg-white/10 transition-all">
              <h4 className="text-sm font-medium text-purple-400 mb-2 group-hover:text-purple-300 transition-colors">
                Target Audience
              </h4>
              <p className="text-gray-300 group-hover:text-gray-200 transition-colors">
                {problem.audience}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 group-hover:bg-white/10 transition-all">
              <h4 className="text-sm font-medium text-blue-400 mb-2 group-hover:text-blue-300 transition-colors">
                Real Example
              </h4>
              <p className="text-gray-300 group-hover:text-gray-200 transition-colors">
                {problem.example}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filter niches based on category and search term
  const filteredNiches = (hasGeneratedNew ? niches : initialNiches).filter(niche => {
    const matchesCategory = !selectedCategory || niche.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      niche.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      niche.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col">
      <Head>
        <title>NicheVault - Find Your Next Million-Dollar Digital Product</title>
        <meta name="description" content="NicheVault helps you discover untapped market opportunities and high-value problems worth solving. Get AI-powered insights to build your next successful digital product." />
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
            <span className="text-xl font-bold">NicheVault</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="border-t border-white/10 bg-[#0F1117] shadow-lg animate-fade-in">
            <div className="p-4 space-y-4">
              <button
                onClick={() => router.push('/?step=niches')}
                className="w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2"
              >
                <span>🎯</span>
                Generate Niches
              </button>
              <button
                onClick={() => router.push('/about')}
                className="w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2"
              >
                <span>ℹ️</span>
                About Us
              </button>
              {user && (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2"
                >
                  <span>📊</span>
                  Dashboard
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed top-0 w-full z-50 bg-[#0F1117]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              onClick={handleLogoClick}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold">N</span>
              </div>
              <span className="text-xl font-bold">NicheVault</span>
            </div>

            <div className="flex items-center space-x-8">
              <button 
                onClick={() => router.push('/?step=niches')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Generate Niches
              </button>
              <button 
                onClick={() => router.push('/about')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                About Us
              </button>
              {user ? (
                <>
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Dashboard
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <span className="text-white">{user.name}</span>
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
                              setUser(null);
                              setSavedGuides([]);
                              setStep('start');
                              setShowUserMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5"
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg hover:opacity-90 transition-all"
                >
                  Login / Register
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-16 pb-24">
        {/* Only show landing page if not logged in */}
        {!user && step === 'start' && (
          <>
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
              {/* Add animated background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-purple-600/30 to-blue-500/30 animate-slow-spin"></div>
                <div className="absolute inset-0 bg-[#0F1117]/90 backdrop-blur-3xl"></div>
              </div>
              <div className="absolute w-96 h-96 -top-48 -left-48 bg-purple-500/30 rounded-full blur-3xl animate-pulse-slow"></div>
              <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-blue-500/30 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>

              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="max-w-3xl mx-auto">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
                    Find Your Next
                    <span className="block gradient-text">
                      Million-Dollar Digital Product
                    </span>
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-400 mb-10">
                    Let AI discover untapped market opportunities and high-value problems that people will pay premium prices to solve. Get detailed guides to build and launch your digital product empire.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={getNiches}
                      className="gradient-button"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analyzing Markets...
                        </span>
                      ) : (
                        'Analyze Market'
                      )}
                    </button>
                  </div>
                  {!user && (
                    <p className="mt-4 text-sm text-gray-400">
                      Login required to analyze markets and save guides
                    </p>
                  )}
                </div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-20">
                  <div className="glass-card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-500/10 group-hover:from-purple-600/20 group-hover:to-blue-500/20 transition-all duration-500"></div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-500/10 animate-gradient-shift"></div>
                    </div>
                    
                    <div className="relative flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 transform group-hover:scale-110 transition-all duration-300">
                        <span className="text-3xl">🎯</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">High-Value Problems</h3>
                      <p className="text-gray-400">Find problems people will pay premium prices to solve</p>
                    </div>
                  </div>

                  <div className="glass-card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-500/10 group-hover:from-blue-600/20 group-hover:to-purple-500/20 transition-all duration-500"></div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-500/10 animate-gradient-shift"></div>
                    </div>
                    
                    <div className="relative flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 transform group-hover:scale-110 transition-all duration-300">
                        <span className="text-3xl">🎯</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Market Validation</h3>
                      <p className="text-gray-400">Get proof of market size, competition analysis, and revenue potential</p>
                    </div>
                  </div>

                  <div className="glass-card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-blue-500/10 group-hover:from-green-600/20 group-hover:to-blue-500/20 transition-all duration-500"></div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-blue-500/10 animate-gradient-shift"></div>
                    </div>
                    
                    <div className="relative flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 transform group-hover:scale-110 transition-all duration-300">
                        <span className="text-3xl">📈</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Launch Strategy</h3>
                      <p className="text-gray-400">Step-by-step guides to build and scale your product</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 relative overflow-hidden">
              <div className="relative max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12 gradient-text">How to Build Your Digital Product Empire</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="glass-card text-center">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold">1</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Find Million-Dollar Problems</h3>
                    <p className="text-gray-400">Discover high-value problems in profitable niches that people will pay to solve</p>
                  </div>
                  <div className="glass-card text-center">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold">2</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Validate the Market</h3>
                    <p className="text-gray-400">Get proof of market size, competition analysis, and revenue potential</p>
                  </div>
                  <div className="glass-card text-center">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold">3</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Build & Launch</h3>
                    <p className="text-gray-400">Follow our proven strategies to create and scale your digital product</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {step === 'niches' && (
          <section className="pt-24 pb-12 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="glass-card p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <h2 className="text-2xl md:text-3xl font-bold gradient-text animate-gradient">
                      {hasGeneratedNew ? 'Explore More Niches' : 'Popular AI Niches'}
                    </h2>
                    <div className="animate-pulse-slow hidden md:block">
                      <span className="text-2xl">✨</span>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full md:w-auto">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full md:w-auto px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-white focus:border-purple-500 transition-all hover:bg-white/10"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat, index) => (
                        <option key={index} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div className="flex gap-2 w-full md:w-auto">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search niches..."
                        className="flex-1 px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-white focus:border-purple-500 transition-all hover:bg-white/10"
                      />
                      <button
                        onClick={getNiches}
                        className="px-4 md:px-6 py-2 gradient-button animate-glow whitespace-nowrap"
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="hidden md:inline">Generating...</span>
                          </span>
                        ) : (
                          <>
                            <span className="hidden md:inline">Generate New Niches</span>
                            <span className="md:hidden">Generate</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="glass-card animate-pulse">
                        <div className="h-6 bg-white/10 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
                        <div className="h-4 bg-white/10 rounded w-5/6 mb-4"></div>
                        <div className="flex justify-between items-center">
                          <div className="h-6 bg-white/10 rounded w-1/4"></div>
                          <div className="h-6 bg-white/10 rounded w-1/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNiches.map((niche, index) => (
                      <div
                        key={index}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <NicheCard
                          niche={niche}
                          onClick={() => getProblems(niche.name)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {!loading && filteredNiches.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🔍🔍</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No niches found</h3>
                    <p className="text-gray-400 mb-8">
                      {searchTerm 
                        ? "No niches match your search criteria" 
                        : "Try generating new niches or adjusting your filters"}
                    </p>
                    <button
                      onClick={getNiches}
                      className="px-6 py-3 gradient-button animate-glow"
                    >
                      Generate New Niches
                    </button>
                  </div>
                )}

                {!loading && filteredNiches.length > 0 && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={getNiches}
                      className="px-6 py-3 gradient-button animate-glow"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        'Discover More Niches'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 'problems' && (
          <section className="pt-24 pb-12 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setStep('niches')}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 className="text-3xl font-bold gradient-text">
                      Problems in {selectedNiche}
                    </h2>
                  </div>
                  <button
                    onClick={() => setStep('niches')}
                    className="px-4 py-2 text-sm font-medium gradient-button"
                  >
                    Generate New Niche
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="glass-card animate-pulse">
                        <div className="flex justify-between items-start mb-4">
                          <div className="h-6 bg-white/10 rounded w-1/3"></div>
                          <div className="h-6 bg-white/10 rounded w-1/4"></div>
                        </div>
                        <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
                        <div className="h-4 bg-white/10 rounded w-5/6 mb-4"></div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-white/5">
                            <div className="h-4 bg-white/10 rounded w-1/4 mb-2"></div>
                            <div className="h-4 bg-white/10 rounded w-full"></div>
                          </div>
                          <div className="p-4 rounded-lg bg-white/5">
                            <div className="h-4 bg-white/10 rounded w-1/4 mb-2"></div>
                            <div className="h-4 bg-white/10 rounded w-full"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {problems.map((problem, index) => (
                      <ProblemCard
                        key={index}
                        problem={problem}
                        onClick={() => getSolution(problem.title)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 'solution' && (
          <section className="pt-24 pb-12 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setStep('problems')}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div>
                      <h2 className="text-3xl font-bold gradient-text mb-2">
                        Solution Guide
                      </h2>
                      <p className="text-gray-400">
                        For: {selectedProblem} in {selectedNiche}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep('problems')}
                      className="px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      More Problems
                    </button>
                    <button
                      onClick={() => setStep('niches')}
                      className="px-4 py-2 text-sm font-medium gradient-button"
                    >
                      Generate New Niche
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-5/6"></div>
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-2/3"></div>
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-4/5"></div>
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-invert max-w-none">
                      <div className="space-y-8">
                        {formatSolution(solution).map((section, index) => {
                          switch (section.type) {
                            case 'heading':
                              return (
                                <h3 key={index} className="text-2xl font-bold text-purple-400 mb-4">
                                  {section.content}
                                </h3>
                              );
                            case 'bold':
                              return (
                                <p key={index} className="text-lg font-semibold text-gray-200 mb-3">
                                  {section.content}
                                </p>
                              );
                            case 'italic':
                              return (
                                <p key={index} className="text-base italic text-gray-300 mb-3">
                                  {section.content}
                                </p>
                              );
                            case 'list':
                              return (
                                <ul key={index} className="list-none space-y-3 pl-4 mb-6">
                                  {isStringArray(section.content) && section.content.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 text-gray-300">
                                      <span className="text-purple-400 mt-1">•</span>
                                      <span className="flex-1">{item.replace('- ', '')}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            default:
                              return (
                                <p key={index} className="text-base text-gray-300 leading-relaxed mb-4">
                                  {section.content}
                                </p>
                              );
                          }
                        })}
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10">
                      <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-semibold">Want more details?</h3>
                          <button
                            onClick={expandSolution}
                            disabled={expandingContent || expandedSolution}
                            className={`px-6 py-3 rounded-lg transition-all ${
                              expandedSolution 
                                ? 'bg-green-500/20 text-green-300 cursor-not-allowed'
                                : 'gradient-button'
                            }`}
                          >
                            {expandingContent ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Expanding...
                              </span>
                            ) : expandedSolution ? (
                              'Guide Expanded'
                            ) : (
                              'Expand Guide'
                            )}
                          </button>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-semibold">Ready to save this guide?</h3>
                          <div className="flex gap-4">
                            {generatePDFLink({ niche: selectedNiche, problem: selectedProblem, solution })}
                            <button
                              onClick={saveGuide}
                              className="px-6 py-3 rounded-lg gradient-button transform hover:scale-[1.02] transition-all"
                            >
                              Save Guide
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Add auth modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1A1B23] p-8 rounded-lg max-w-md w-full relative">
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold mb-6">
                {authMode === 'login' ? 'Login' : 'Register'}
              </h2>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <input
                    type="text"
                    placeholder="Name"
                    value={authForm.name}
                    onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 rounded-lg"
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 rounded-lg"
                  required
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={authForm.password}
                    onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 rounded-lg pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/5 transition-all"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
                <button type="submit" className="w-full gradient-button">
                  {authMode === 'login' ? 'Login' : 'Register'}
                </button>
              </form>
              <p className="mt-4 text-center text-gray-400">
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-purple-400 hover:text-purple-300"
                >
                  {authMode === 'login' ? 'Register' : 'Login'}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Add saved guides section */}
        {user && savedGuides.length > 0 && step === 'start' && (
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-3xl font-bold mb-8 gradient-text">Your Saved Guides</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {savedGuides.map((guide) => (
                  <div key={guide._id} className="glass-card p-6 md:p-8">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold">{guide.niche}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => togglePin(guide._id)}
                          className={`p-2 rounded-lg ${guide.isPinned ? 'bg-yellow-500/20' : 'bg-white/5'}`}
                        >
                          📌
                        </button>
                        <button
                          onClick={() => deleteGuide(guide._id)}
                          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-400 mb-4">{guide.problem}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {new Date(guide.createdAt).toLocaleDateString()}
                      </span>
                      {generatePDFLink(guide)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* Add notification component */}
      {notification?.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`glass-card p-4 ${
            notification.type === 'error' ? 'border-red-500/50' : 'border-green-500/50'
          } border flex items-center gap-3 max-w-md`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              notification.type === 'error' ? 'bg-red-500/20' : 'bg-green-500/20'
            }`}>
              {notification.type === 'error' ? '❌' : '✅'}
            </div>
            <p className="text-sm flex-1">{notification.message}</p>
            <button 
              onClick={() => setNotification(prev => ({ ...prev!, show: false }))}
              className="p-1 hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 