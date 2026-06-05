require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { ExpressPeerServer } = require('peer');
const mongoose = require('mongoose');

// =============================================
// KONEKSI MONGODB ATLAS
// =============================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/velorachat';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Terhubung ke MongoDB!'))
  .catch(err => {
    console.error('❌ Gagal terhubung ke MongoDB:', err.message);
    console.log('⚠️  Server tetap berjalan tapi data tidak akan tersimpan ke database.');
  });

// =============================================
// SCHEMA & MODELS
// =============================================
const ChatSchema = new mongoose.Schema({ _id: String, id: String }, { strict: false });
const Chat = mongoose.model('Chat', ChatSchema);

const AttendanceSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Attendance = mongoose.model('Attendance', AttendanceSchema);

const EmployeeSchema = new mongoose.Schema({ id: { type: String, unique: true } }, { strict: false });
const Employee = mongoose.model('Employee', EmployeeSchema);

const SettingsSchema = new mongoose.Schema({ userId: { type: String, unique: true } }, { strict: false });
const Settings = mongoose.model('Settings', SettingsSchema);

const ShiftSchema = new mongoose.Schema({ id: { type: String, unique: true } }, { strict: false });
const Shift = mongoose.model('Shift', ShiftSchema);

const StarredSchema = new mongoose.Schema({ id: { type: String, unique: true } }, { strict: false });
const Starred = mongoose.model('Starred', StarredSchema);

const DeviceSchema = new mongoose.Schema({ id: { type: String, unique: true } }, { strict: false });
const Device = mongoose.model('Device', DeviceSchema);

const FamilyMapSchema = new mongoose.Schema({ userId: { type: String, unique: true } }, { strict: false });
const FamilyMap = mongoose.model('FamilyMap', FamilyMapSchema);

const PayrollSchema = new mongoose.Schema({ id: { type: String, unique: true } }, { strict: false });
const Payroll = mongoose.model('Payroll', PayrollSchema);

// =============================================
// EXPRESS & SOCKET.IO SETUP
// =============================================
const app = express();
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);

const peerServer = ExpressPeerServer(server, { debug: true, path: '/' });
app.use('/peerjs', peerServer);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const host = req.protocol + '://' + req.headers.host;
  const fileUrl = `${host}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.originalname, mimetype: req.file.mimetype });
});

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

// Serve Frontend Static Files
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Catch-all route to serve index.html for React SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/peerjs') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// =============================================
// SOCKET.IO EVENTS
// =============================================
io.on('connection', async (socket) => {
  console.log(`Pengguna Terhubung: ${socket.id}`);

  // Kirim semua data awal saat user terhubung
  try {
    const [chats, attendances, employees, settingsArr, shifts, starred, devices, familyMap, payroll] = await Promise.all([
      Chat.find().lean(),
      Attendance.find().sort({ createdAt: -1 }).lean(),
      Employee.find().lean(),
      Settings.find().lean(),
      Shift.find().lean(),
      Starred.find().lean(),
      Device.find().lean(),
      FamilyMap.find().lean(),
      Payroll.find().lean(),
    ]);

    // Ubah array settings menjadi objek { userId: {...} }
    const settingsObj = {};
    settingsArr.forEach(s => { settingsObj[s.userId] = s; });

    socket.emit('initial_data', chats);
    socket.emit('initial_attendances', attendances);
    socket.emit('initial_employees', employees);
    socket.emit('initial_settings', settingsObj);
    socket.emit('initial_shifts', shifts);
    socket.emit('initial_starred', starred);
    socket.emit('initial_devices', devices);
    socket.emit('initial_family_map', familyMap);
    socket.emit('initial_payroll', payroll);
  } catch (err) {
    console.error('Error fetching initial data:', err.message);
  }

  // ---- CHAT ----
  socket.on('send_message', async (data) => {
    try {
      const chat = await Chat.findOne({ id: data.chatId });
      if (chat) {
        if (chat.type === 'groups' && data.topicId) {
          const topics = chat.topics || [];
          const topicIdx = topics.findIndex(t => t.id === data.topicId);
          if (topicIdx !== -1) {
            if (!topics[topicIdx].messages) topics[topicIdx].messages = [];
            topics[topicIdx].messages.push(data.message);
            await Chat.updateOne({ id: data.chatId }, { $set: { topics } });
          }
        } else {
          await Chat.updateOne({ id: data.chatId }, { $push: { messages: data.message } });
        }
      }
    } catch (err) { console.error('send_message error:', err.message); }
    socket.broadcast.emit('receive_message', data);
  });

  socket.on('create_group', async (data) => {
    try {
      await Chat.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    } catch (err) { console.error('create_group error:', err.message); }
    socket.broadcast.emit('new_group', data);
  });

  socket.on('create_topic', async (data) => {
    try {
      await Chat.updateOne({ id: data.chatId }, { $push: { topics: data.topic } });
    } catch (err) { console.error('create_topic error:', err.message); }
    socket.broadcast.emit('new_topic', data);
  });

  socket.on('update_chat_info', async (data) => {
    const { chatId, topicId, updates } = data;
    try {
      if (topicId) {
        const chat = await Chat.findOne({ id: chatId });
        if (chat && chat.topics) {
          const idx = chat.topics.findIndex(t => String(t.id) === String(topicId));
          if (idx !== -1) {
            chat.topics[idx] = { ...chat.topics[idx], ...updates };
            await Chat.updateOne({ id: chatId }, { $set: { topics: chat.topics } });
          }
        }
      } else {
        await Chat.updateOne({ id: chatId }, { $set: updates });
      }
    } catch (err) { console.error('update_chat_info error:', err.message); }
    io.emit('chat_info_updated', data);
  });

  socket.on('delete_chat', async (data) => {
    const safeId = String(data.targetId);
    try {
      // Coba hapus sebagai chat
      const result = await Chat.deleteOne({ id: safeId });
      if (result.deletedCount === 0) {
        // Coba hapus sebagai topic di dalam grup
        await Chat.updateMany({}, { $pull: { topics: { id: safeId } } });
      }
    } catch (err) { console.error('delete_chat error:', err.message); }
    io.emit('chat_deleted', { targetId: safeId });
  });

  // ---- ATTENDANCE ----
  socket.on('clock_in', async (data) => {
    try {
      await Attendance.create(data);
    } catch (err) { console.error('clock_in error:', err.message); }
    io.emit('new_attendance', data);
  });

  // ---- EMPLOYEES ----
  socket.on('add_employee', async (data) => {
    try {
      await Employee.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    } catch (err) { console.error('add_employee error:', err.message); }
    io.emit('new_employee', data);
  });

  socket.on('edit_employee', async (data) => {
    try {
      const updated = await Employee.findOneAndUpdate({ id: data.id }, { $set: data }, { new: true, upsert: true }).lean();
      io.emit('employee_updated', updated);
    } catch (err) { console.error('edit_employee error:', err.message); }
  });

  socket.on('delete_employee', async (payload) => {
    const idToDelete = typeof payload === 'object' ? payload.employeeId : payload;
    try {
      await Employee.deleteOne({ id: idToDelete });
    } catch (err) { console.error('delete_employee error:', err.message); }
    io.emit('employee_deleted', idToDelete);
  });

  socket.on('bind_device', async ({ employeeId, deviceId }) => {
    try {
      const updated = await Employee.findOneAndUpdate({ id: employeeId }, { $set: { boundDevice: deviceId } }, { new: true }).lean();
      io.emit('employee_updated', updated);
    } catch (err) { console.error('bind_device error:', err.message); }
  });

  socket.on('reset_device', async ({ employeeId }) => {
    try {
      const updated = await Employee.findOneAndUpdate({ id: employeeId }, { $set: { boundDevice: null } }, { new: true }).lean();
      io.emit('employee_updated', updated);
    } catch (err) { console.error('reset_device error:', err.message); }
  });

  // ---- SETTINGS ----
  socket.on('save_settings', async ({ userId, updates }) => {
    try {
      const updated = await Settings.findOneAndUpdate(
        { userId },
        { $set: { userId, ...updates } },
        { upsert: true, new: true }
      ).lean();
      io.emit('settings_updated', { userId, settings: updated });
    } catch (err) { console.error('save_settings error:', err.message); }
  });

  // ---- SHIFTS ----
  socket.on('save_shift', async (data) => {
    try {
      await Shift.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    } catch (err) { console.error('save_shift error:', err.message); }
    const shifts = await Shift.find().lean();
    io.emit('initial_shifts', shifts);
  });

  socket.on('delete_shift', async (shiftId) => {
    try {
      await Shift.deleteOne({ id: shiftId });
    } catch (err) { console.error('delete_shift error:', err.message); }
    const shifts = await Shift.find().lean();
    io.emit('initial_shifts', shifts);
  });

  // ---- STARRED MESSAGES ----
  socket.on('star_message', async (data) => {
    try {
      await Starred.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    } catch (err) { console.error('star_message error:', err.message); }
    const starred = await Starred.find().lean();
    io.emit('initial_starred', starred);
  });

  socket.on('unstar_message', async (messageId) => {
    try {
      await Starred.deleteOne({ id: messageId });
    } catch (err) { console.error('unstar_message error:', err.message); }
    const starred = await Starred.find().lean();
    io.emit('initial_starred', starred);
  });

  // ---- DEVICES ----
  socket.on('add_device', async (data) => {
    try {
      await Device.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    } catch (err) { console.error('add_device error:', err.message); }
    const devices = await Device.find().lean();
    io.emit('initial_devices', devices);
  });

  socket.on('remove_device', async (deviceId) => {
    try {
      await Device.deleteOne({ id: deviceId });
    } catch (err) { console.error('remove_device error:', err.message); }
    const devices = await Device.find().lean();
    io.emit('initial_devices', devices);
  });

  // ---- FAMILY MAP ----
  socket.on('update_location', async (data) => {
    try {
      await FamilyMap.findOneAndUpdate({ userId: data.userId }, data, { upsert: true, new: true });
    } catch (err) { console.error('update_location error:', err.message); }
    const familyMap = await FamilyMap.find().lean();
    io.emit('initial_family_map', familyMap);
  });

  // ---- PAYROLL ----
  socket.on('save_payroll', async (data) => {
    try {
      await Payroll.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    } catch (err) { console.error('save_payroll error:', err.message); }
    const payroll = await Payroll.find().lean();
    io.emit('initial_payroll', payroll);
  });

  socket.on('delete_payroll', async (id) => {
    try {
      await Payroll.deleteOne({ id });
    } catch (err) { console.error('delete_payroll error:', err.message); }
    const payroll = await Payroll.find().lean();
    io.emit('initial_payroll', payroll);
  });

  // ---- BACKUP & RESTORE ----
  socket.on('request_backup', async () => {
    try {
      const [chats, attendances, employees] = await Promise.all([
        Chat.find().lean(), Attendance.find().lean(), Employee.find().lean()
      ]);
      socket.emit('backup_data', { chats, attendances, employees });
    } catch (err) { console.error('request_backup error:', err.message); }
  });

  socket.on('restore_backup', async (data) => {
    try {
      if (data.employees) {
        for (const emp of data.employees) {
          await Employee.findOneAndUpdate({ id: emp.id }, emp, { upsert: true });
        }
      }
    } catch (err) { console.error('restore_backup error:', err.message); }
    io.emit('all_reset_done');
  });

  // ---- RESET ALL ----
  socket.on('reset_all', async () => {
    try {
      await Promise.all([
        Chat.deleteMany({}),
        Attendance.deleteMany({}),
        Employee.deleteMany({}),
      ]);
    } catch (err) { console.error('reset_all error:', err.message); }
    io.emit('all_reset_done');
  });

  // ---- WebRTC Signaling ----
  socket.on('initiate_call', (data) => socket.broadcast.emit('incoming_call', data));
  socket.on('accept_call', (data) => socket.broadcast.emit('call_accepted', data));
  socket.on('reject_call', (data) => socket.broadcast.emit('call_rejected', data));
  socket.on('end_call', (data) => socket.broadcast.emit('call_ended', data));

  socket.on('disconnect', () => {
    console.log(`Pengguna Terputus: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server Velora Chat berjalan di port ${PORT}`);
});
