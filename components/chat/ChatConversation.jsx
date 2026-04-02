'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Trash2, X, AlertTriangle } from 'lucide-react';

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export default function ChatConversation({ conversationId, userId, senderRole, conversationType = 'admin_vendor', onNewMessage, onCloseChat }) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [senders, setSenders] = useState({}); // { [senderId]: { displayName, imageUrl } }
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [contextMenu, setContextMenu] = useState(null); // { x, y, messageId }
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const contextMenuRef = useRef(null);

  // Initial load: fetch messages via REST
  useEffect(() => {
    if (!conversationId || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const url =
          conversationType === 'vendor_vendor'
            ? `/api/messages/${conversationId}?type=vendor_vendor`
            : conversationType === 'admin_admin'
              ? `/api/messages/${conversationId}?type=admin_admin`
              : `/api/messages/${conversationId}`;
        const { data } = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          const msgList = data?.messages ?? (Array.isArray(data) ? data : []);
          const sendersMap = data?.senders ?? {};
          setMessages(msgList);
          setSenders(sendersMap);
        }
      } catch (err) {
        if (!cancelled) toast.error(err?.response?.data?.error || err?.message || 'Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, userId, conversationType, getToken]);

  // Socket: connect, join room, listen receiveMessage
  useEffect(() => {
    if (!conversationId || !userId) return;
    const socket = io(socketUrl);
    socketRef.current = socket;
    socket.emit('joinConversation', conversationId);
    socket.on('receiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
      onNewMessage?.();
    });
    socket.on('sendMessageError', (err) => {
      toast.error(err?.error || 'Failed to send');
    });
    return () => {
      socket.off('receiveMessage');
      socket.off('sendMessageError');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close context menu on click outside (use mousedown so menu button click runs first)
  useEffect(() => {
    if (!contextMenu) return;
    const close = (e) => {
      if (contextMenuRef.current && contextMenuRef.current.contains(e.target)) return;
      setContextMenu(null);
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', close), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', close);
    };
  }, [contextMenu]);

  const handleSend = (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !socketRef.current) return;
    const payload = {
      conversationId,
      senderId: userId,
      senderRole: conversationType === 'vendor_vendor' ? 'vendor' : conversationType === 'admin_admin' ? 'admin' : (senderRole || 'admin'),
      content,
    };
    if (conversationType === 'vendor_vendor') payload.type = 'vendor_vendor';
    if (conversationType === 'admin_admin') payload.type = 'admin_admin';
    if (conversationType === 'admin_vendor') payload.type = 'admin_vendor';
    socketRef.current.emit('sendMessage', payload);
    setInput('');
  };

  const handleDeleteMessage = async (messageId) => {
    setContextMenu(null);
    if (!window.confirm('Delete this message permanently?')) return;
    try {
      const token = await getToken();
      const url =
        conversationType === 'vendor_vendor'
          ? `/api/messages/${conversationId}/${messageId}?type=vendor_vendor`
          : conversationType === 'admin_admin'
            ? `/api/messages/${conversationId}/${messageId}?type=admin_admin`
            : `/api/messages/${conversationId}/${messageId}`;
      await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      onNewMessage?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to delete message');
    }
  };

  const handleMessageContextMenu = (e, messageId, isOwn) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, messageId: isOwn ? messageId : null });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 p-4">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#0a0a0b]">
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] min-w-[160px] py-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl pointer-events-auto"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.messageId && (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 transition cursor-pointer"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMessage(contextMenu.messageId); }}
            >
              <Trash2 size={14} />
              Delete message
            </button>
          )}
          {onCloseChat && (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu(null); onCloseChat(); }}
            >
              <X size={14} />
              Close chat
            </button>
          )}
        </div>
      )}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, messageId: null }); }}
      >
        {messages.map((m) => {
          const isOwn = m.senderId === userId;
          const isWarning = m.messageType === 'warning';
          const profile = senders[m.senderId] ?? {};
          const displayName = profile.displayName ?? (m.senderRole ? `${m.senderRole.charAt(0).toUpperCase()}${m.senderRole.slice(1)}` : 'User');
          return (
            <div
              key={m.id}
              role={isOwn ? 'button' : undefined}
              tabIndex={isOwn ? 0 : undefined}
              data-message-id={m.id}
              data-own-message={isOwn ? 'true' : undefined}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isOwn ? 'cursor-context-menu' : ''}`}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMessageContextMenu(e, m.id, isOwn);
              }}
            >
              <div className={`min-w-0 max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <p className="text-xs text-zinc-500 mb-0.5 px-0.5">{displayName}</p>
                <div
                  className={`rounded-xl px-4 py-2 select-text ${isWarning
                      ? 'bg-rose-500/10 text-rose-200 border border-rose-500/50 relative overflow-hidden'
                      : isOwn
                        ? 'bg-amber-500/20 text-amber-100 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}
                >
                  {isWarning && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-rose-400 font-bold text-[10px] tracking-wider uppercase">
                      <AlertTriangle size={12} />
                      Official Notice
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2.5 rounded-lg bg-amber-500 text-zinc-900 font-semibold text-sm hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
