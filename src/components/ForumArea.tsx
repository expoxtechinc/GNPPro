import React, { useState, useEffect } from 'react';
import { 
  collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, increment, getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ForumPost, ForumComment, UserProfile } from '../types';
import { MessageSquare, ThumbsUp, PlusCircle, ArrowLeft, Send, Sparkles, User, Calendar, BookOpen, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ForumAreaProps {
  userProfile: UserProfile;
}

export default function ForumArea({ userProfile }: ForumAreaProps) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'general' | 'study' | 'announcements'>('general');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  // Fetch Forum Posts
  useEffect(() => {
    const q = query(collection(db, 'forum_posts'), orderBy('datePosted', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: ForumPost[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ForumPost);
      });
      setPosts(list);
      setLoading(false);
    }, (err) => {
      console.error("Error reading forum posts: ", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch Comments dynamic stream
  useEffect(() => {
    if (!selectedPost) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, `forum_posts/${selectedPost.id}/comments`), 
      orderBy('datePosted', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list: ForumComment[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ForumComment);
      });
      setComments(list);
    }, (err) => {
      console.error("Error loading chat comments: ", err);
    });

    return () => unsub();
  }, [selectedPost]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      await addDoc(collection(db, 'forum_posts'), {
        courseId: selectedChannel,
        courseCode: selectedChannel === 'general' ? 'General QA' : (selectedChannel === 'study' ? 'Peer Study' : 'Announcements'),
        authorId: userProfile.uid,
        authorName: userProfile.fullName,
        authorRole: userProfile.role,
        title: newTitle.trim(),
        content: newContent.trim(),
        likesCount: 0,
        commentsCount: 0,
        datePosted: new Date().toISOString()
      });

      setNewTitle('');
      setNewContent('');
      setShowCreatePost(false);
    } catch (err) {
      console.error("Failed to create post direction: ", err);
    }
  };

  const handleLikePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const pDoc = doc(db, 'forum_posts', postId);
      await updateDoc(pDoc, {
        likesCount: increment(1)
      });
    } catch (err) {
      console.error("Failed to appreciate post: ", err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newCommentText.trim()) return;

    try {
      const commentPayload = {
        postId: selectedPost.id,
        authorId: userProfile.uid,
        authorName: userProfile.fullName,
        authorRole: userProfile.role,
        content: newCommentText.trim(),
        datePosted: new Date().toISOString()
      };

      // Add to subcollection
      await addDoc(collection(db, `forum_posts/${selectedPost.id}/comments`), commentPayload);

      // Increment parent count
      await updateDoc(doc(db, 'forum_posts', selectedPost.id), {
        commentsCount: increment(1)
      });

      setNewCommentText('');
    } catch (err) {
      console.error("Failed to log reply: ", err);
    }
  };

  const filteredPosts = posts.filter(p => p.courseId === selectedChannel);

  return (
    <div id="forum-area" className="flex flex-col h-full bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 shadow-sm max-w-4xl mx-auto font-sans">
      <AnimatePresence mode="wait">
        {!selectedPost ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >
            {/* Header Area */}
            <div className="bg-white border-b border-neutral-100 p-4 shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-905 flex items-center gap-1.5">
                  <MessageSquare className="w-5 h-5 text-blue-800" />
                  <span>AIOU Collegiate Forums</span>
                </h3>
                <p className="text-[11px] text-neutral-500">Cross-border student discussion boards & updates</p>
              </div>
              <button
                onClick={() => setShowCreatePost(true)}
                className="bg-blue-900 hover:bg-blue-950 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Topic</span>
              </button>
            </div>

            {/* channel switcher tabs */}
            <div className="bg-neutral-100/50 p-2 border-b border-neutral-150 flex gap-1 shrink-0 overflow-x-auto">
              <button
                onClick={() => setSelectedChannel('general')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  selectedChannel === 'general' ? 'bg-white text-blue-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                📢 General Discussion
              </button>
              <button
                onClick={() => setSelectedChannel('study')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  selectedChannel === 'study' ? 'bg-white text-blue-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                🧠 Peer Study Network
              </button>
              <button
                onClick={() => setSelectedChannel('announcements')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  selectedChannel === 'announcements' ? 'bg-white text-blue-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                ⚡ Campus Broadcasts
              </button>
            </div>

            {/* Posting Form Modal overlay */}
            <AnimatePresence>
              {showCreatePost && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-blue-50/50 border-b border-blue-100 p-4"
                >
                  <form onSubmit={handleCreatePost} className="space-y-3 max-w-xl mx-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-900">Post new topic to #{selectedChannel}</span>
                      <button 
                        type="button" 
                        onClick={() => setShowCreatePost(false)}
                        className="text-neutral-400 hover:text-neutral-600 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                    <div>
                      <input 
                        type="text" 
                        required
                        placeholder="Subject title..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <textarea 
                        required
                        rows={3}
                        placeholder="Detail your question or academic discourse..."
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-850 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button 
                        type="submit" 
                        className="bg-blue-900 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-blue-955 transition cursor-pointer"
                      >
                        Broadcast Thread
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Forum Post List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {loading ? (
                <div className="p-8 text-center text-xs text-neutral-500 font-mono">Loading university forums...</div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-dashed border-neutral-200 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-xs text-neutral-505 font-bold">No threads available in #{selectedChannel}</p>
                  <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">Be the first remote learner to open an active discussion thread about courses, lectures, or schedules!</p>
                </div>
              ) : (
                filteredPosts.map(post => (
                  <motion.div
                    key={post.id}
                    layoutId={`post-${post.id}`}
                    onClick={() => setSelectedPost(post)}
                    className="bg-white hover:bg-neutral-50 border border-neutral-200 rounded-2xl p-4 transition shadow-xs cursor-pointer flex flex-col justify-between gap-3.5"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="text-xs font-bold text-neutral-900 tracking-tight leading-relaxed">{post.title}</h4>
                        <span className="bg-blue-50 text-blue-950 text-[9px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap">
                          {post.courseCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 line-clamp-2 mt-1.5 leading-relaxed">{post.content}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-[10px] text-neutral-400 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-100 text-blue-900 text-[10px] rounded-full flex items-center justify-center font-bold">
                          {post.authorName[0]}
                        </div>
                        <div>
                          <span className="font-bold text-neutral-700">{post.authorName}</span>
                          <span className="mx-1 text-neutral-300">•</span>
                          <span className="capitalize text-neutral-501 bg-neutral-100 px-1 py-0.2 rounded font-mono text-[8px]">{post.authorRole}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => handleLikePost(post.id, e)}
                          className="flex items-center gap-1.5 hover:text-blue-900 transition focus:outline-none"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{post.likesCount || 0}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{post.commentsCount || 0}</span>
                        </div>
                        <span>{new Date(post.datePosted).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          /* Detailed Single Thread and Comments View */
          <motion.div 
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full bg-white"
          >
            {/* Thread Header bar */}
            <div className="bg-neutral-50 border-b border-neutral-100 p-4 shrink-0 flex items-center justify-between gap-3">
              <button 
                onClick={() => setSelectedPost(null)}
                className="text-neutral-500 hover:text-neutral-800 flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Channels</span>
              </button>
              <div className="bg-blue-100 text-blue-950 font-mono text-[9px] font-bold px-2.5 py-1 rounded-xl">
                #{selectedPost.courseCode}
              </div>
            </div>

            {/* Body Scrolling Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Question card */}
              <div className="bg-blue-50/20 border border-blue-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-900 text-white rounded-full flex items-center justify-center font-bold text-xs">
                    {selectedPost.authorName[0]}
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-neutral-800">{selectedPost.authorName}</h5>
                    <div className="flex items-center gap-1 text-[9px] text-neutral-400 font-mono">
                      <span className="capitalize">{selectedPost.authorRole}</span>
                      <span>•</span>
                      <span>{new Date(selectedPost.datePosted).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-neutral-900 tracking-tight leading-relaxed">{selectedPost.title}</h4>
                <div className="text-xs text-neutral-800 whitespace-pre-line leading-relaxed">{selectedPost.content}</div>

                <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                  <button 
                    onClick={(e) => handleLikePost(selectedPost.id, e)}
                    className="flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-blue-900 transition focus:outline-none"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Highly Helpful ({selectedPost.likesCount || 0})</span>
                  </button>
                </div>
              </div>

              {/* Comments Title */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest px-1">Replies ({comments.length})</span>
              </div>

              {/* Comments Stack */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-[10px] italic text-neutral-400 text-center p-4">No replies logged yet. Share your guidance or take a stance below.</p>
                ) : (
                  comments.map(comm => (
                    <div key={comm.id} className="bg-neutral-50/60 rounded-xl p-3 border border-neutral-100 flex items-start gap-2.5">
                      <div className="w-5.5 h-5.5 bg-neutral-200 text-neutral-700 font-bold rounded-full flex items-center justify-center text-[9px] mt-0.5 shrink-0">
                        {comm.authorName[0]}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-700">{comm.authorName}</span>
                          <span className="text-[8px] font-mono text-neutral-400">{new Date(comm.datePosted).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-neutral-800 leading-relaxed">{comm.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Discussion Reply box */}
            <div className="border-t border-neutral-100 p-3 bg-white shrink-0">
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input 
                  type="text"
                  required
                  placeholder="Share your academic feedback..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 bg-neutral-100 border border-neutral-150 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <button 
                  type="submit"
                  className="bg-blue-900 hover:bg-blue-950 text-white rounded-xl py-2 px-3.5 flex items-center justify-center cursor-pointer transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
