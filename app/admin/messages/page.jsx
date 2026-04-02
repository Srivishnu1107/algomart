'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MessageCircle, ArrowLeftIcon, Search, MoreVertical, Trash2 } from 'lucide-react';
import ChatConversation from '@/components/chat/ChatConversation';

export default function AdminMessagesPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState('admin_vendor'); // so admin_admin works when conversation not yet in list
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [showAdminList, setShowAdminList] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [listContextMenu, setListContextMenu] = useState(null); // { x, y, conversationId, type }
  const listContextMenuRef = useRef(null);
  const [selectedContact, setSelectedContact] = useState(null); // { name, imageUrl } when opened from search

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/conversations/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user?.id, getToken]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetchConversations();
  }, [user?.id, fetchConversations]);

  // Refetch list periodically when viewing list so new conversations appear
  useEffect(() => {
    if (!user?.id || selectedId) return;
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [user?.id, selectedId, fetchConversations]);

  // Refetch list when window gains focus so new conversations appear
  useEffect(() => {
    if (!user?.id) return;
    const onFocus = () => fetchConversations();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id, fetchConversations]);

  // Debounced store search (min 2 chars)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = await getToken();
        const { data } = await axios.get(`/api/admin/stores?search=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSearchResults(data?.stores ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, getToken]);

  const deleteConversationById = async (conversationIdToDelete, type) => {
    setConversationMenuOpen(false);
    setListContextMenu(null);
    if (!conversationIdToDelete || !window.confirm('Delete this entire conversation and all messages permanently?')) return;
    const conversationType = type ?? conversations.find((c) => c.id === conversationIdToDelete)?.type ?? 'admin_vendor';
    try {
      const token = await getToken();
      await axios.post(
        '/api/conversations/delete',
        { conversationId: conversationIdToDelete, type: conversationType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (selectedId === conversationIdToDelete) {
        setSelectedId(null);
        setSelectedType('admin_vendor');
        setSelectedContact(null);
      }
      await fetchConversations();
      toast.success('Conversation deleted');
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to delete conversation');
    }
  };

  const deleteConversation = () => deleteConversationById(selectedId, conversations.find((c) => c.id === selectedId)?.type);

  useEffect(() => {
    if (!listContextMenu) return;
    const close = (e) => {
      if (listContextMenuRef.current && !listContextMenuRef.current.contains(e.target)) setListContextMenu(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [listContextMenu]);

  const startConversation = async (store) => {
    const vendorId = store.user?.id ?? store.userId;
    if (!vendorId) return;
    try {
      const token = await getToken();
      const { data } = await axios.post(
        '/api/conversations',
        { vendorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedId(data.id);
      setSelectedType('admin_vendor');
      setSelectedContact({ name: store.name ?? 'Vendor', imageUrl: store.logo ?? null });
      setSearchQuery('');
      setSearchResults([]);
      await fetchConversations();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to start conversation');
    }
  };

  const fetchAdminList = useCallback(async () => {
    setAdminListLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/admin/admins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminList(data?.admins ?? []);
      setShowAdminList(true);
    } catch {
      setAdminList([]);
      toast.error('Failed to load admins');
    } finally {
      setAdminListLoading(false);
    }
  }, [getToken]);

  const startAdminConversation = async (admin) => {
    if (!admin?.userId) return;
    try {
      const token = await getToken();
      const { data } = await axios.post(
        '/api/admin-conversations',
        { otherAdminId: admin.userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedId(data.id);
      setSelectedType('admin_admin');
      setSelectedContact({ name: admin.email ?? 'Admin', imageUrl: admin.imageUrl ?? null });
      setShowAdminList(false);
      setAdminList([]);
      await fetchConversations();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to start conversation');
    }
  };

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-120px)] bg-[#0a0a0b]">
      {/* Left: Conversation list — hidden on small screens when a conversation is selected */}
      <div
        className={`flex flex-col w-full md:w-[280px] lg:w-[320px] flex-shrink-0 border-r border-zinc-800 bg-zinc-900/30 ${selectedId ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <MessageCircle size={20} className="text-amber-400" />
            Messages
          </h2>
        </div>
        <div className="p-2 border-b border-zinc-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stores by name..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          {searchQuery.trim().length >= 2 && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900/80">
              {searchLoading ? (
                <p className="p-3 text-sm text-zinc-500">Searching...</p>
              ) : searchResults.length === 0 ? (
                <p className="p-3 text-sm text-zinc-500">No stores found.</p>
              ) : (
                <ul className="py-1">
                  {searchResults.map((store) => (
                    <li key={store.id}>
                      <button
                        type="button"
                        onClick={() => startConversation(store)}
                        className="w-full text-left px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-amber-100 transition flex items-center gap-3"
                      >
                        <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center">
                          {store.logo ? (
                            <img src={store.logo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-zinc-400">{(store.name || '?').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="font-medium truncate min-w-0 flex-1">{store.name}</span>
                        {store.username && (
                          <span className="text-xs text-zinc-500 shrink-0">@{store.username}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="mt-2">
            <button
              type="button"
              onClick={fetchAdminList}
              disabled={adminListLoading}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-amber-100 transition"
            >
              {adminListLoading ? 'Loading...' : 'Message another admin'}
            </button>
            {showAdminList && adminList.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900/80">
                <ul className="py-1">
                  {adminList.map((admin) => (
                    <li key={admin.userId}>
                      <button
                        type="button"
                        onClick={() => startAdminConversation(admin)}
                        className="w-full text-left px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-amber-100 transition flex items-center gap-3"
                      >
                        <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center">
                          {admin.imageUrl ? (
                            <img src={admin.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-zinc-400">{(admin.email || '?').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="truncate min-w-0 flex-1">{admin.email ?? admin.userId}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {showAdminList && !adminListLoading && adminList.length === 0 && (
              <p className="p-2 text-xs text-zinc-500">No other admins.</p>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 relative">
          {listContextMenu && (
            <div
              ref={listContextMenuRef}
              className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
              style={{ left: listContextMenu.x, top: listContextMenu.y }}
            >
              <button
                type="button"
                onClick={() => deleteConversationById(listContextMenu.conversationId, listContextMenu.type)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 transition"
              >
                <Trash2 size={14} />
                Delete conversation
              </button>
            </div>
          )}
          {loading ? (
            <p className="text-sm text-zinc-500 p-4">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-zinc-500 p-4">No conversations yet.</p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setSelectedType((c.type === 'admin_admin' ? 'admin_admin' : 'admin_vendor'));
                      setSelectedContact(null);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setListContextMenu({ x: e.clientX, y: e.clientY, conversationId: c.id, type: c.type ?? 'admin_vendor' });
                    }}
                    className={`w-full text-left rounded-lg px-3 py-3 flex items-center gap-3 transition border ${
                      selectedId === c.id
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-100'
                        : 'border-transparent bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center">
                      {c.otherPartyImageUrl ? (
                        <img src={c.otherPartyImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium text-zinc-400">
                          {(c.storeName ?? c.otherPartyLabel ?? '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium truncate min-w-0 flex-1">
                      {c.storeName ?? c.otherPartyLabel ?? 'Vendor'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: Message list + input or empty state */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#0a0a0b]">
        {selectedId ? (
          <>
            <div className="flex items-center justify-between gap-2 p-3 border-b border-zinc-800 bg-[#0a0a0b] sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition shrink-0"
                  aria-label="Back to list"
                >
                  <ArrowLeftIcon size={20} />
                </button>
                {(() => {
                  const fromContact = selectedContact;
                  const selected = conversations.find((c) => c.id === selectedId);
                  const headerName = fromContact?.name ?? selected?.storeName ?? selected?.otherPartyLabel ?? 'Conversation';
                  const headerImage = fromContact?.imageUrl ?? selected?.otherPartyImageUrl ?? null;
                  return (
                    <>
                      <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center">
                        {headerImage ? (
                          <img src={headerImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-zinc-400">{headerName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-zinc-300 truncate">{headerName}</span>
                    </>
                  );
                })()}
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setConversationMenuOpen((o) => !o)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition"
                  aria-label="Conversation menu"
                >
                  <MoreVertical size={20} />
                </button>
                {conversationMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden onClick={() => setConversationMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] py-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                      <button
                        type="button"
                        onClick={deleteConversation}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 transition"
                      >
                        <Trash2 size={14} />
                        Delete conversation
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <ChatConversation
              conversationId={selectedId}
              userId={user.id}
              senderRole="admin"
              conversationType={conversations.find((c) => c.id === selectedId)?.type ?? selectedType}
              onNewMessage={fetchConversations}
              onCloseChat={() => { setSelectedId(null); setSelectedType('admin_vendor'); setSelectedContact(null); }}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 p-4">
            <p className="text-sm">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
