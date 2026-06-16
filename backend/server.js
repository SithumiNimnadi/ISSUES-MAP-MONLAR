require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create upload folders
const uploadDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(uploadDir, 'images');
const pdfsDir = path.join(uploadDir, 'pdfs');
const mapsDir = path.join(uploadDir, 'maps');

[uploadDir, imagesDir, pdfsDir, mapsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Serve static files
app.use('/uploads', express.static(uploadDir));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecoGuardian';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('MongoDB error:', err.message));

// ============ SCHEMAS ============

// Issue Schema
const issueSchema = new mongoose.Schema({
  title: String,
  category: String,
  description: String,
  district: String,
  lat: Number,
  lng: Number,
  status: { type: String, default: 'pending' },
  resolution: String,
  resolvedBy: String,
  resolvedAt: Date,
  relatedResearch: [String],
  connectedResearch: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Research' }],
  images: [String],
  pdfs: [String],
  mapImages: [String],
  reportedBy: { type: String },
  reporterEmail: { type: String },
  reporterName: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

// Research Schema
const researchSchema = new mongoose.Schema({
  title: String,
  district: String,
  province: String,
  description: String,
  fullContent: String,
  researcher: String,
  organization: String,
  links: [String],
  relatedIssues: [String],
  connectedIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  images: [String],
  pdfs: [String],
  mapImages: [String],
  uploadDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

// User Schema for Authentication
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'reviewer', 'user'], 
    default: 'user' 
  },
  createdAt: { type: Date, default: Date.now }
});

// User Report Schema
const userReportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  district: { type: String, required: true },
  lat: { type: Number },
  lng: { type: Number },
  reporterName: { type: String, required: true },
  reporterEmail: { type: String, required: true },
  category: { type: String, default: 'Other' },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'approved', 'rejected'], 
    default: 'pending' 
  },
  adminNotes: { type: String },
  images: [String],
  createdAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: String
});

// Create Models
const Issue = mongoose.model('Issue', issueSchema);
const Research = mongoose.model('Research', researchSchema);
const User = mongoose.model('User', userSchema);
const UserReport = mongoose.model('UserReport', userReportSchema);

// ============ AUTHENTICATION MIDDLEWARE ============

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, role: role || 'user' });
    await user.save();
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
      token, 
      user: { id: user._id, username: user.username, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { id: user._id, username: user.username, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// ============ SSE CLIENTS ============
const clients = [];
const recentNotifications = [];
let pendingUpdates = false;
let lastUpdateTimestamp = Date.now();

// ============ MULTER STORAGE ============

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'images' || file.fieldname === 'image') cb(null, imagesDir);
    else if (file.fieldname === 'mapImages') cb(null, mapsDir);
    else if (file.fieldname === 'pdfs') cb(null, pdfsDir);
    else cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

// ============ HELPER FUNCTIONS ============

const deleteStoredFile = (filePath) => {
  if (!filePath) return;
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const fullPath = path.join(__dirname, cleanPath);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) console.error('Error deleting file:', err.message);
    });
  }
};

function broadcastNotification(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date() });
  clients.forEach(client => {
    try {
      client.res.write(`data: ${message}\n\n`);
    } catch (error) {
      console.error('Error broadcasting to client:', error);
    }
  });
  console.log(`📢 Broadcasted ${type} notification to ${clients.length} clients`);
}

function addNotification(type, title, message, data = {}) {
  const notification = {
    type,
    title,
    message,
    data,
    timestamp: new Date()
  };
  recentNotifications.push(notification);
  pendingUpdates = true;
  lastUpdateTimestamp = Date.now();
  
  if (recentNotifications.length > 50) {
    recentNotifications.shift();
  }
  
  broadcastNotification(type, { ...data, title, message });
  return notification;
}

// ============ HEALTH & TEST ENDPOINTS ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    status: 'online',
  });
});

// ============ SSE & NOTIFICATION ENDPOINTS ============

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to event stream' })}\n\n`);
  
  const clientId = Date.now();
  const newClient = { id: clientId, res: res };
  clients.push(newClient);
  
  const pingInterval = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 30000);
  
  req.on('close', () => {
    clearInterval(pingInterval);
    const index = clients.findIndex(client => client.id === clientId);
    if (index !== -1) clients.splice(index, 1);
    console.log(`Client ${clientId} disconnected. Total clients: ${clients.length}`);
  });
  
  console.log(`Client ${clientId} connected. Total clients: ${clients.length}`);
});

app.get('/api/notifications/check', (req, res) => {
  res.json({ hasUpdates: pendingUpdates, lastCheck: lastUpdateTimestamp });
  if (pendingUpdates) pendingUpdates = false;
});

app.get('/api/notifications/recent', (req, res) => {
  res.json(recentNotifications.slice(-20));
});

// ============ ISSUES ROUTES (PROTECTED) ============

// GET issues - requires authentication
app.get('/api/issues', authenticateToken, async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 }).populate('connectedResearch');
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/issues/:id', authenticateToken, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('connectedResearch');
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST issue - requires admin
app.post('/api/issues', authenticateToken, isAdmin, upload.any(), async (req, res) => {
  try {
    const { title, category, description, district, lat, lng } = req.body;

    if (!title || !description || !district || !lat || !lng) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description', 'district', 'lat', 'lng'],
      });
    }

    const images = [];
    const mapImages = [];
    const pdfs = [];

    (req.files || []).forEach((file) => {
      if (file.fieldname === 'images' || file.fieldname === 'image') {
        images.push('/uploads/images/' + file.filename);
      } else if (file.fieldname === 'mapImages') {
        mapImages.push('/uploads/maps/' + file.filename);
      } else if (file.fieldname === 'pdfs') {
        pdfs.push('/uploads/pdfs/' + file.filename);
      }
    });

    const issue = new Issue({
      title,
      category: category || 'Waste & Pollution',
      description,
      district,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      status: 'pending',
      images,
      mapImages,
      pdfs,
      createdAt: new Date(),
    });

    const savedIssue = await issue.save();
    
    addNotification('new_issue', 'New Issue Reported', 
      `${savedIssue.title} was reported in ${savedIssue.district}`,
      { issueId: savedIssue._id, title: savedIssue.title, district: savedIssue.district }
    );
    
    res.status(201).json(savedIssue);
  } catch (err) {
    console.error('Error creating issue:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT issue - requires admin
app.put('/api/issues/:id', authenticateToken, isAdmin, upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    const parsedData = req.body.data ? JSON.parse(req.body.data) : req.body;

    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : [];
    const existingMapImages = req.body.existingMapImages ? JSON.parse(req.body.existingMapImages) : [];
    const existingPdfs = req.body.existingPdfs ? JSON.parse(req.body.existingPdfs) : [];

    const images = [...existingImages];
    const mapImages = [...existingMapImages];
    const pdfs = [...existingPdfs];

    (req.files || []).forEach((file) => {
      if (file.fieldname === 'images' || file.fieldname === 'image') {
        images.push('/uploads/images/' + file.filename);
      } else if (file.fieldname === 'mapImages') {
        mapImages.push('/uploads/maps/' + file.filename);
      } else if (file.fieldname === 'pdfs') {
        pdfs.push('/uploads/pdfs/' + file.filename);
      }
    });

    const originalIssue = await Issue.findById(id);
    if (!originalIssue) return res.status(404).json({ error: 'Issue not found' });

    (originalIssue.images || []).filter((img) => !images.includes(img)).forEach(deleteStoredFile);
    (originalIssue.mapImages || []).filter((img) => !mapImages.includes(img)).forEach(deleteStoredFile);
    (originalIssue.pdfs || []).filter((pdf) => !pdfs.includes(pdf)).forEach(deleteStoredFile);

    const updatedIssue = await Issue.findByIdAndUpdate(
      id,
      {
        title: parsedData.title,
        category: parsedData.category,
        description: parsedData.description,
        district: parsedData.district,
        images,
        mapImages,
        pdfs,
        status: parsedData.status,
        resolution: parsedData.resolution,
        resolvedBy: parsedData.resolvedBy,
        resolvedAt: parsedData.resolvedAt,
        updatedAt: new Date(),
      },
      { new: true }
    );

    res.json(updatedIssue);
  } catch (err) {
    console.error('Error updating issue:', err);
    res.status(500).json({ error: err.message });
  }
});

// Resolve issue - requires admin
app.put('/api/issues/:id/resolve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { resolutionNotes, resolvedBy } = req.body;
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolution: resolutionNotes,
        resolvedBy: resolvedBy,
        resolvedAt: new Date()
      },
      { new: true }
    );
    
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    
    addNotification('issue_resolved', 'Issue Resolved',
      `${issue.title} has been resolved!`,
      { issueId: issue._id, title: issue.title }
    );
    
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE issue - requires admin
app.delete('/api/issues/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (issue) {
      [...(issue.images || []), ...(issue.mapImages || []), ...(issue.pdfs || [])].forEach(deleteStoredFile);
    }
    await Issue.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ RESEARCH ROUTES (PROTECTED) ============

// GET research - requires authentication
app.get('/api/research', authenticateToken, async (req, res) => {
  try {
    const research = await Research.find().sort({ createdAt: -1 }).populate('connectedIssues');
    res.json(research);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/research/:id', authenticateToken, async (req, res) => {
  try {
    const research = await Research.findById(req.params.id).populate('connectedIssues');
    if (!research) return res.status(404).json({ error: 'Research not found' });
    res.json(research);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST research - requires admin
app.post('/api/research', authenticateToken, isAdmin, upload.any(), async (req, res) => {
  try {
    console.log('📝 Creating new research');
    
    let title, district, province, description, fullContent, researcher, organization;
    let links = [];
    let mapImages = [];
    
    if (req.body.data) {
      const data = JSON.parse(req.body.data);
      title = data.title;
      district = data.district;
      province = data.province || '';
      description = data.description || '';
      fullContent = data.fullContent || '';
      researcher = data.researcher || '';
      organization = data.organization || '';
      links = data.links || [];
    } else {
      title = req.body.title;
      district = req.body.district;
      province = req.body.province || '';
      description = req.body.description || '';
      fullContent = req.body.fullContent || '';
      researcher = req.body.researcher || '';
      organization = req.body.organization || '';
      if (req.body.links) links = JSON.parse(req.body.links);
    }
    
    if (!title || !district) {
      return res.status(400).json({ error: 'Title and district are required' });
    }
    
    const images = [];
    const pdfs = [];
    
    (req.files || []).forEach((file) => {
      if (file.fieldname === 'images' || file.fieldname === 'image') {
        images.push('/uploads/images/' + file.filename);
      } else if (file.fieldname === 'mapImages') {
        mapImages.push('/uploads/maps/' + file.filename);
      } else if (file.fieldname === 'pdfs') {
        pdfs.push('/uploads/pdfs/' + file.filename);
      }
    });
    
    const research = new Research({
      title,
      district,
      province,
      description,
      fullContent,
      researcher,
      organization,
      links,
      images,
      pdfs,
      mapImages,
      createdAt: new Date(),
    });
    
    const savedResearch = await research.save();
    
    addNotification('new_research', 'New Research Published',
      `${savedResearch.title} has been added to the library`,
      { researchId: savedResearch._id, title: savedResearch.title }
    );
    
    console.log('✅ Research created:', savedResearch._id);
    res.status(201).json(savedResearch);
    
  } catch (err) {
    console.error('Error creating research:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT research - requires admin
app.put('/api/research/:id', authenticateToken, isAdmin, upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    
    let parsedData;
    if (req.body.data) {
      parsedData = JSON.parse(req.body.data);
    } else {
      parsedData = req.body;
    }
    
    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : [];
    const existingPdfs = req.body.existingPdfs ? JSON.parse(req.body.existingPdfs) : [];
    const existingMapImages = req.body.existingMapImages ? JSON.parse(req.body.existingMapImages) : [];
    
    const images = [...existingImages];
    const pdfs = [...existingPdfs];
    const mapImages = [...existingMapImages];
    
    (req.files || []).forEach((file) => {
      if (file.fieldname === 'images' || file.fieldname === 'image') {
        images.push('/uploads/images/' + file.filename);
      } else if (file.fieldname === 'mapImages') {
        mapImages.push('/uploads/maps/' + file.filename);
      } else if (file.fieldname === 'pdfs') {
        pdfs.push('/uploads/pdfs/' + file.filename);
      }
    });
    
    const originalResearch = await Research.findById(id);
    if (!originalResearch) return res.status(404).json({ error: 'Research not found' });
    
    (originalResearch.images || []).filter((img) => !images.includes(img)).forEach(deleteStoredFile);
    (originalResearch.pdfs || []).filter((pdf) => !pdfs.includes(pdf)).forEach(deleteStoredFile);
    (originalResearch.mapImages || []).filter((map) => !mapImages.includes(map)).forEach(deleteStoredFile);
    
    const updatedResearch = await Research.findByIdAndUpdate(
      id,
      {
        title: parsedData.title,
        district: parsedData.district,
        province: parsedData.province,
        description: parsedData.description,
        fullContent: parsedData.fullContent,
        researcher: parsedData.researcher,
        organization: parsedData.organization,
        links: parsedData.links || [],
        images,
        pdfs,
        mapImages,
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    res.json(updatedResearch);
  } catch (err) {
    console.error('Error updating research:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE research - requires admin
app.delete('/api/research/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const research = await Research.findById(req.params.id);
    if (research) {
      [...(research.images || []), ...(research.pdfs || []), ...(research.mapImages || [])].forEach(deleteStoredFile);
    }
    await Research.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ USER REPORT ROUTES ============

// Submit a user report - PUBLIC (no authentication required)
app.post('/api/user-reports', upload.any(), async (req, res) => {
  try {
    console.log('📝 Received user report submission');
    
    const { title, description, location, district, lat, lng, reporterName, reporterEmail, category } = req.body;

    if (!title || !description || !location || !district || !reporterName || !reporterEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['title', 'description', 'location', 'district', 'reporterName', 'reporterEmail']
      });
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === 'images') {
          images.push('/uploads/images/' + file.filename);
        }
      });
    }

    const report = new UserReport({
      title,
      description,
      location,
      district,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      reporterName,
      reporterEmail: reporterEmail.toLowerCase().trim(),
      category: category || 'Other',
      images,
      status: 'pending',
      createdAt: new Date()
    });

    const savedReport = await report.save();
    console.log('✅ User report saved:', savedReport._id);
    
    addNotification('new_user_report', 'New User Report Submitted',
      `${savedReport.title} reported by ${savedReport.reporterName} in ${savedReport.district}`,
      { reportId: savedReport._id, title: savedReport.title, district: savedReport.district }
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Report submitted successfully!',
      report: savedReport 
    });
    
  } catch (err) {
    console.error('Error submitting report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's own reports (for regular users)
app.get('/api/my-reports', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userEmail = user.email;
    console.log(`🔍 Fetching reports for: ${userEmail}`);
    
    const reports = await UserReport.find({ reporterEmail: userEmail }).sort({ createdAt: -1 });
    console.log(`📋 Found ${reports.length} reports`);
    
    res.json(reports);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ NEW EDIT AND DELETE ENDPOINTS FOR USER REPORTS ============

// Edit user's own report (User can edit their own pending reports)
app.put('/api/my-reports/:id', authenticateToken, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { title, description, location, district, category } = req.body;
    
    // Find the report
    const report = await UserReport.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Get user email
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if this report belongs to the user
    if (report.reporterEmail !== user.email) {
      return res.status(403).json({ error: 'You can only edit your own reports' });
    }
    
    // Only allow editing if status is pending
    if (report.status !== 'pending') {
      return res.status(403).json({ error: 'Cannot edit report that is already reviewed' });
    }
    
    // Update fields
    if (title) report.title = title;
    if (description) report.description = description;
    if (location) report.location = location;
    if (district) report.district = district;
    if (category) report.category = category;
    report.updatedAt = new Date();
    
    await report.save();
    
    res.json({ success: true, message: 'Report updated successfully', report });
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete user's own report (User can delete their own pending reports)
app.delete('/api/my-reports/:id', authenticateToken, async (req, res) => {
  try {
    const reportId = req.params.id;
    
    // Find the report
    const report = await UserReport.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Get user email
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if this report belongs to the user
    if (report.reporterEmail !== user.email) {
      return res.status(403).json({ error: 'You can only delete your own reports' });
    }
    
    // Only allow deletion if status is pending
    if (report.status !== 'pending') {
      return res.status(403).json({ error: 'Cannot delete report that is already reviewed' });
    }
    
    // Delete images if any
    if (report.images && report.images.length > 0) {
      report.images.forEach(deleteStoredFile);
    }
    
    await UserReport.findByIdAndDelete(reportId);
    
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ END OF NEW EDIT/DELETE ENDPOINTS ============

// Get all user reports (Admin only)
app.get('/api/user-reports', authenticateToken, isAdmin, async (req, res) => {
  try {
    const reports = await UserReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single user report (Admin only)
app.get('/api/user-reports/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const report = await UserReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update report status (Admin only)
app.put('/api/user-reports/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const report = await UserReport.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNotes,
        reviewedAt: new Date(),
        reviewedBy: req.user.username
      },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: 'Report not found' });
    
    addNotification('report_reviewed', 'User Report Reviewed',
      `Report "${report.title}" has been ${status}`,
      { reportId: report._id, title: report.title, status }
    );
    
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user report (Admin only)
app.delete('/api/user-reports/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const report = await UserReport.findById(req.params.id);
    if (report) {
      (report.images || []).forEach(deleteStoredFile);
    }
    await UserReport.findByIdAndDelete(req.params.id);
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ CONNECTION ROUTES ============

app.post('/api/research/:researchId/connect-issue/:issueId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { researchId, issueId } = req.params;
    
    const research = await Research.findByIdAndUpdate(
      researchId,
      { $addToSet: { connectedIssues: issueId } },
      { new: true }
    );
    
    const issue = await Issue.findByIdAndUpdate(
      issueId,
      { $addToSet: { connectedResearch: researchId } },
      { new: true }
    );
    
    if (!research || !issue) {
      return res.status(404).json({ error: 'Research or Issue not found' });
    }
    
    addNotification('connection_made', 'Research Connected',
      `"${research.title}" connected to "${issue.title}"`,
      { researchId, issueId, researchTitle: research.title, issueTitle: issue.title }
    );
    
    res.json({ success: true, message: 'Successfully connected research to issue' });
  } catch (error) {
    console.error('Error connecting research to issue:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/issues/:issueId/connect-research/:researchId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { issueId, researchId } = req.params;
    
    const issue = await Issue.findByIdAndUpdate(
      issueId,
      { $addToSet: { connectedResearch: researchId } },
      { new: true }
    );
    
    const research = await Research.findByIdAndUpdate(
      researchId,
      { $addToSet: { connectedIssues: issueId } },
      { new: true }
    );
    
    if (!issue || !research) {
      return res.status(404).json({ error: 'Issue or Research not found' });
    }
    
    res.json({ success: true, message: 'Successfully connected issue to research' });
  } catch (error) {
    console.error('Error connecting issue to research:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/connections', authenticateToken, async (req, res) => {
  try {
    const issues = await Issue.find().select('_id title status district connectedResearch');
    const research = await Research.find().select('_id title district connectedIssues');
    
    res.json({
      success: true,
      issues,
      research,
      stats: {
        totalIssues: issues.length,
        totalResearch: research.length,
      }
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test-connection', (req, res) => {
  res.json({ 
    success: true,
    message: 'Connection routes are working!'
  });
});

// ============ CREATE DEFAULT ADMIN USER ============
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      const admin = new User({
        username: 'admin',
        email: 'admin@ecoguardian.com',
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('\n👑 Default admin user created!');
      console.log('📧 Email: admin@ecoguardian.com');
      console.log('🔑 Password: Admin@123');
      console.log('⚠️  Please change this password after first login!\n');
    }
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
};

// ============ START SERVER ============

const PORT = process.env.PORT || 5001;

app.listen(PORT, async () => {
  console.log('\n🚀 ========================================');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('🚀 ========================================');
  console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
  console.log(`📋 Issues API: http://localhost:${PORT}/api/issues`);
  console.log(`🔬 Research API: http://localhost:${PORT}/api/research`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`📢 User Reports API: http://localhost:${PORT}/api/user-reports`);
  console.log(`👤 My Reports API: http://localhost:${PORT}/api/my-reports`);
  console.log(`✏️ Edit My Report: PUT http://localhost:${PORT}/api/my-reports/:id`);
  console.log(`🗑️ Delete My Report: DELETE http://localhost:${PORT}/api/my-reports/:id`);
  console.log('\n✅ Ready to accept requests!\n');
  
  // Create default admin user
  await createDefaultAdmin();
});