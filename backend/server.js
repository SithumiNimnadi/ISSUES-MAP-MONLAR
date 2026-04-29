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
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

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

const Issue = mongoose.model('Issue', issueSchema);
const Research = mongoose.model('Research', researchSchema);

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

// ============ ISSUES ROUTES ============

app.get('/api/issues', async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 }).populate('connectedResearch');
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/issues/:id', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('connectedResearch');
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/issues', upload.any(), async (req, res) => {
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

app.put('/api/issues/:id', upload.any(), async (req, res) => {
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

app.put('/api/issues/:id/resolve', async (req, res) => {
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

app.delete('/api/issues/:id', async (req, res) => {
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

// ============ RESEARCH ROUTES ============

app.get('/api/research', async (req, res) => {
  try {
    const research = await Research.find().sort({ createdAt: -1 }).populate('connectedIssues');
    res.json(research);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/research/:id', async (req, res) => {
  try {
    const research = await Research.findById(req.params.id).populate('connectedIssues');
    if (!research) return res.status(404).json({ error: 'Research not found' });
    res.json(research);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/research', upload.any(), async (req, res) => {
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

app.put('/api/research/:id', upload.any(), async (req, res) => {
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

app.delete('/api/research/:id', async (req, res) => {
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

// ============ CONNECTION ROUTES ============

app.post('/api/research/:researchId/connect-issue/:issueId', async (req, res) => {
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

app.post('/api/issues/:issueId/connect-research/:researchId', async (req, res) => {
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

app.get('/api/connections', async (req, res) => {
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

// ============ START SERVER ============

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('🚀 ========================================');
  console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
  console.log(`📋 Issues API: http://localhost:${PORT}/api/issues`);
  console.log(`🔬 Research API: http://localhost:${PORT}/api/research`);
  console.log('\n✅ Ready to accept requests!\n');
});