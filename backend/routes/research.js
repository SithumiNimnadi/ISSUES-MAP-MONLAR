const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Research = require('../models/Research');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads');
const imagesDir = path.join(uploadDir, 'images');
const pdfsDir = path.join(uploadDir, 'pdfs');

[uploadDir, imagesDir, pdfsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configure multer for multiple file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'images' || file.fieldname === 'image') {
      cb(null, imagesDir);
    } else if (file.fieldname === 'pdfs') {
      cb(null, pdfsDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Helper function to parse JSON arrays
const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// GET all research
router.get('/', async (req, res) => {
  try {
    const research = await Research.find().sort({ createdAt: -1 });
    res.json(research);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single research
router.get('/:id', async (req, res) => {
  try {
    const research = await Research.findById(req.params.id);
    if (!research) return res.status(404).json({ error: 'Research not found' });
    res.json(research);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new research with multiple files
router.post('/', upload.any(), async (req, res) => {
  try {
    console.log('📝 Creating new research');
    console.log('Request body:', req.body);
    console.log('Files received:', req.files?.length || 0);

    // Parse data if sent as JSON string
    let parsedData = req.body;
    if (req.body.data) {
      parsedData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    }

    // Extract files
    const images = [];
    const pdfs = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.fieldname === 'images' || file.fieldname === 'image') {
          images.push('/uploads/images/' + file.filename);
        } else if (file.fieldname === 'pdfs') {
          pdfs.push('/uploads/pdfs/' + file.filename);
        }
      });
    }

    // Parse links
    const links = parseJsonArray(parsedData.links);

    // Validate required fields
    if (!parsedData.title || !parsedData.district) {
      return res.status(400).json({ error: 'Title and district are required' });
    }

    const researchData = {
      title: parsedData.title,
      district: parsedData.district,
      province: parsedData.province || '',
      description: parsedData.description || '',
      fullContent: parsedData.fullContent || '',
      researcher: parsedData.researcher || '',
      organization: parsedData.organization || '',
      links: links,
      images: images,
      pdfs: pdfs,
      imageUrl: images[0] || '',
      relatedIssues: [],
      createdAt: new Date()
    };

    const research = new Research(researchData);
    const savedResearch = await research.save();

    console.log('✅ Research created:', savedResearch._id);
    console.log(`   Images: ${images.length}, PDFs: ${pdfs.length}, Links: ${links.length}`);

    res.status(201).json(savedResearch);
  } catch (err) {
    console.error('Error creating research:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update research with multiple files
router.put('/:id', upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Updating research:', id);
    console.log('Files received:', req.files?.length || 0);

    // Parse data
    let parsedData = req.body;
    if (req.body.data) {
      parsedData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    }

    // Parse existing files
    const existingImages = req.body.existingImages ? parseJsonArray(req.body.existingImages) : [];
    const existingPdfs = req.body.existingPdfs ? parseJsonArray(req.body.existingPdfs) : [];

    // Start with existing files
    const images = [...existingImages];
    const pdfs = [...existingPdfs];

    // Add new files
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.fieldname === 'images' || file.fieldname === 'image') {
          images.push('/uploads/images/' + file.filename);
        } else if (file.fieldname === 'pdfs') {
          pdfs.push('/uploads/pdfs/' + file.filename);
        }
      });
    }

    // Delete removed files from disk
    const originalResearch = await Research.findById(id);
    if (originalResearch) {
      const deleteFile = (filePath) => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }
      };

      (originalResearch.images || []).filter(img => !images.includes(img)).forEach(deleteFile);
      (originalResearch.pdfs || []).filter(pdf => !pdfs.includes(pdf)).forEach(deleteFile);
    }

    // Parse links
    const links = parsedData.links ? (Array.isArray(parsedData.links) ? parsedData.links : []) : [];

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
        links: links,
        images: images,
        pdfs: pdfs,
        imageUrl: images[0] || '',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedResearch) {
      return res.status(404).json({ error: 'Research not found' });
    }

    console.log('✅ Research updated:', id);
    res.json(updatedResearch);
  } catch (err) {
    console.error('Error updating research:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE research
router.delete('/:id', async (req, res) => {
  try {
    const research = await Research.findById(req.params.id);
    if (research) {
      // Delete associated files
      const deleteFile = (filePath) => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }
      };

      (research.images || []).forEach(deleteFile);
      (research.pdfs || []).forEach(deleteFile);
    }

    await Research.findByIdAndDelete(req.params.id);
    res.json({ message: 'Research deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;