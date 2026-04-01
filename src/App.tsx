import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Article, UserProfile, OperationType, FirestoreErrorInfo } from './types';
import { ArticleEditor } from './components/ArticleEditor';
import { ArticleList } from './components/ArticleList';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Stethoscope, 
  BookOpen, 
  LogIn, 
  LogOut, 
  Plus, 
  X,
  ChevronDown,
  User as UserIcon,
  Shield
} from 'lucide-react';
import { cn } from './lib/utils';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100">
            <h2 className="text-2xl font-serif text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">The application encountered an unexpected error. Please try refreshing the page.</p>
            <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-40 text-red-500">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-red-600 text-white py-3 rounded-full font-medium hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'richtext' | 'markdown'>('richtext');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function testConnection() {
      try {
        // Test connection to Firestore
        await getDocFromServer(doc(db, '_connection_test', 'test'));
        console.log("Firestore connection successful");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore connection failed: The client is offline. Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Sync user profile
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          // Check if this email should be an admin
          const isAdminEmail = currentUser.email === 'taffen12@gmail.com' || currentUser.email === 'affen12@gmail.com';
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Upgrade to admin if email matches but role is 'user'
            if (isAdminEmail && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin' as const };
              await setDoc(userDocRef, updatedProfile);
              setUserProfile(updatedProfile);
            } else {
              setUserProfile(data);
            }
          } else {
            // Default role for new users
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Anonymous',
              role: isAdminEmail ? 'admin' : 'user'
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.error("Error syncing user profile:", error);
          // Fallback for admin check even if Firestore is offline
          if (currentUser.email === 'taffen12@gmail.com' || currentUser.email === 'affen12@gmail.com') {
            setUserProfile({
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Admin',
              role: 'admin'
            });
          }
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthReady(true);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Article[];
      setArticles(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSaveArticle = async () => {
    if (!user || userProfile?.role !== 'admin') return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'articles'), {
        title,
        content,
        format,
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setTitle('');
      setContent('');
      setIsEditorOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'articles');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!user || userProfile?.role !== 'admin') return;
    if (window.confirm('Are you sure you want to delete this article?')) {
      try {
        await deleteDoc(doc(db, 'articles', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `articles/${id}`);
      }
    }
  };

  const isAdmin = userProfile?.role === 'admin';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-gray-300"
        >
          <Stethoscope size={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-gray-900 font-sans selection:bg-gray-900 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white">
              <Stethoscope size={20} />
            </div>
            <span className="font-serif text-xl tracking-tight font-medium">Dr. Julian</span>
          </div>

          <div className="flex items-center space-x-6">
            {user ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <button 
                    onClick={() => setIsEditorOpen(true)}
                    className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-all shadow-sm"
                  >
                    <Plus size={16} />
                    <span>New Story</span>
                  </button>
                )}
                <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{userProfile?.role}</p>
                    <p className="text-sm font-medium">{user.displayName}</p>
                  </div>
                  <button onClick={handleLogout} className="text-gray-400 hover:text-gray-900 transition-colors">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <LogIn size={20} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-1.5 rounded-full">
                <Shield size={14} className="text-gray-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Board Certified Surgeon</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-serif font-light leading-[0.9] tracking-tighter">
                Healing is an <br />
                <span className="italic text-gray-400">Art of Listening.</span>
              </h1>
              <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
                With over two decades of experience in cardiothoracic surgery, Dr. Julian explores the intersection of medical science and human empathy.
              </p>
              <div className="flex items-center space-x-8 pt-4">
                <div>
                  <p className="text-3xl font-serif font-light">20+</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Years Exp.</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div>
                  <p className="text-3xl font-serif font-light">5k+</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Lives Touched</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=1000" 
                  alt="Dr. Julian"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-3xl shadow-xl max-w-xs hidden md:block">
                <p className="text-sm italic text-gray-600 leading-relaxed">
                  "The most powerful tool in my kit isn't a scalpel, it's the trust a patient places in me."
                </p>
                <div className="mt-4 flex items-center space-x-2">
                  <div className="w-8 h-px bg-gray-900" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">The Philosophy</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Story Section */}
        <section className="bg-white py-32 border-y border-gray-100">
          <div className="max-w-3xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">The Journey</span>
              <h2 className="text-4xl font-serif font-light">A Life Dedicated to the Heart</h2>
            </div>
            <div className="prose prose-lg prose-gray max-w-none font-serif leading-relaxed text-gray-600 space-y-6">
              <p>
                Born in a small coastal town, Julian's fascination with biology began early. Watching his grandfather, a local GP, navigate the complexities of community health, he learned that medicine was as much about storytelling as it was about symptoms.
              </p>
              <p>
                After graduating from Johns Hopkins, he specialized in complex cardiac procedures. But it was during a volunteer mission in East Africa that his perspective shifted. He realized that the most advanced technology is useless without the cultural context and emotional support that patients need to truly recover.
              </p>
              <p>
                Today, Dr. Julian balances his surgical practice with writing, sharing the profound lessons he learns from the operating table and the quiet moments in between.
              </p>
            </div>
          </div>
        </section>

        {/* Blog Section */}
        <section id="journal-section" className="max-w-4xl mx-auto px-6 py-32">
          <div className="flex items-center justify-between mb-20">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Medical Insights</span>
              <h2 className="text-5xl font-serif font-light">The Journal</h2>
            </div>
            <BookOpen size={40} className="text-gray-100" />
          </div>

          <ArticleList 
            articles={articles} 
            isAdmin={isAdmin} 
            onDelete={handleDeleteArticle} 
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 py-20 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white">
              <Stethoscope size={16} />
            </div>
            <span className="font-serif text-lg tracking-tight font-medium">Dr. Julian</span>
          </div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
            © 2026 Medical Portrait & Insights. All Rights Reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-gray-900 transition-colors"><Heart size={20} /></a>
            <a href="#" className="text-gray-400 hover:text-gray-900 transition-colors"><BookOpen size={20} /></a>
          </div>
        </div>
      </footer>

      {/* Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          >
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsEditorOpen(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FDFCFB] rounded-[32px] shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-[#FDFCFB]/80 backdrop-blur-md border-b border-gray-100">
                <h3 className="text-xl font-serif font-medium">New Insight</h3>
                <button 
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <ArticleEditor 
                  title={title}
                  setTitle={setTitle}
                  content={content}
                  setContent={setContent}
                  format={format}
                  setFormat={setFormat}
                  onSave={handleSaveArticle}
                  isSaving={isSaving}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
