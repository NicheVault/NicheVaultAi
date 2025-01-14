import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Footer from '../components/Footer';

interface User {
  id: string;
  name: string;
  email: string;
}

export default function About() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

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
        <title>About NicheVault - AI-Powered Digital Product Research</title>
        <meta name="description" content="Learn how NicheVault helps entrepreneurs discover and validate million-dollar digital product opportunities using AI-powered market research." />
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
                              setShowUserMenu(false);
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
                </>
              ) : (
                <button
                  onClick={() => router.push('/')}
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
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="glass-card">
            <h1 className="text-3xl font-bold mb-8 gradient-text">About NicheVault</h1>
            
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">Our Mission</h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                NicheVault helps entrepreneurs discover and validate million-dollar digital product opportunities. We combine AI-powered market research with proven validation strategies to help you find high-value problems worth solving.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Our platform analyzes market trends, consumer behavior, and competition to identify untapped opportunities where people are willing to pay premium prices for solutions.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">What Makes Us Different</h2>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Problem-First Approach</h3>
                  <p className="text-gray-300">We focus on finding real, painful problems that people are actively seeking solutions for, ensuring there's genuine market demand.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">AI-Powered Analysis</h3>
                  <p className="text-gray-300">Our AI analyzes vast amounts of market data to identify trends and opportunities that humans might miss.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Actionable Strategies</h3>
                  <p className="text-gray-300">Every opportunity comes with a detailed implementation guide, helping you move from idea to profitable product.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-purple-300">How We Help You Succeed</h2>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <span>Identify high-value niches with proven market demand</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <span>Discover problems people will pay premium prices to solve</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">📊</span>
                  <span>Get detailed market validation and competitor analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">📈</span>
                  <span>Follow proven strategies to build and scale your product</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 