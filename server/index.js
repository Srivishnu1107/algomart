require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const prisma = require('./prisma');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.SOCKET_PORT || 3001;

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  socket.on('joinConversation', (conversationId) => {
    if (typeof conversationId === 'string' && conversationId.trim()) {
      socket.join(conversationId.trim());
    }
  });

  socket.on('sendMessage', async (payload) => {
    try {
      const { conversationId, senderId, senderRole, content, type: conversationType, messageType } = payload || {};
      if (!conversationId || !senderId || typeof content !== 'string') {
        socket.emit('sendMessageError', { error: 'Missing required fields' });
        return;
      }
      const contentTrimmed = content.trim();
      if (!contentTrimmed) {
        socket.emit('sendMessageError', { error: 'content must be non-empty' });
        return;
      }

      if (conversationType === 'vendor_vendor') {
        const conv = await prisma.vendorConversation.findUnique({
          where: { id: conversationId },
        });
        if (!conv) {
          socket.emit('sendMessageError', { error: 'Conversation not found' });
          return;
        }
        const isParticipant = conv.vendor1Id === senderId || conv.vendor2Id === senderId;
        if (!isParticipant) {
          socket.emit('sendMessageError', { error: 'Forbidden' });
          return;
        }
        const message = await prisma.vendorMessage.create({
          data: { conversationId, senderId, content: contentTrimmed },
        });
        await prisma.vendorConversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: message.createdAt },
        });
        const out = { id: message.id, conversationId, senderId, senderRole: 'vendor', content: message.content, createdAt: message.createdAt };
        io.to(conversationId).emit('receiveMessage', out);
        return;
      }

      if (conversationType === 'admin_admin') {
        const conv = await prisma.adminConversation.findUnique({
          where: { id: conversationId },
        });
        if (!conv) {
          socket.emit('sendMessageError', { error: 'Conversation not found' });
          return;
        }
        const isParticipant = conv.admin1Id === senderId || conv.admin2Id === senderId;
        if (!isParticipant) {
          socket.emit('sendMessageError', { error: 'Forbidden' });
          return;
        }
        const message = await prisma.adminMessage.create({
          data: { conversationId, senderId, content: contentTrimmed },
        });
        await prisma.adminConversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: message.createdAt },
        });
        const out = { id: message.id, conversationId, senderId, senderRole: 'admin', content: message.content, createdAt: message.createdAt };
        io.to(conversationId).emit('receiveMessage', out);
        return;
      }

      if (!senderRole || !['admin', 'vendor'].includes(senderRole)) {
        socket.emit('sendMessageError', { error: 'senderRole must be admin or vendor' });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        socket.emit('sendMessageError', { error: 'Conversation not found' });
        return;
      }
      // Vendor or any admin can send (shared thread per vendor)
      const isParticipant = conversation.vendorId === senderId || senderRole === 'admin';
      if (!isParticipant) {
        socket.emit('sendMessageError', { error: 'Forbidden' });
        return;
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId,
          senderRole,
          content: contentTrimmed,
          messageType: senderRole === 'admin' && messageType === 'warning' ? 'warning' : 'normal',
        },
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });

      io.to(conversationId).emit('receiveMessage', message);
    } catch (err) {
      console.error('sendMessage error:', err);
      socket.emit('sendMessageError', { error: err.message || 'Server error' });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
});
