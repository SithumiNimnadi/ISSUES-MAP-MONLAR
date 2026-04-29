const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Allow images + PDFs
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype =
      file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  },
});

let issuesStore = [];

let Issue;
try {
  Issue = require('../models/Issue');
} catch (err) {
  console.log('⚠️ Issue model not loaded, using in-memory storage');
}

// Helper: safely parse JSON arrays
const parseArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// GET all issues
router.get('/', async (req, res) => {
  try {
    if (Issue) {
      const issues = await Issue.find().sort({ createdAt: -1 });
      return res.json(issues);
    }

    res.json(
      issuesStore.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    );
  } catch (err) {
    console.error('Error fetching issues:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST new issue
router.post(
  '/',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
    { name: 'mapImages', maxCount: 10 },
    { name: 'pdfs', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      console.log('Received POST request to /api/issues');
      console.log('Body:', req.body);
      console.log('Files:', req.files);

      const {
        title,
        category,
        description,
        district,
        lat,
        lng,
        status,
      } = req.body;

      if (!title || !description || !district) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['title', 'description', 'district'],
        });
      }

      const issueData = {
        title,
        category: category || 'Waste & Pollution',
        description,
        district,
        status: status || 'pending',
        createdAt: new Date(),
      };

      if (lat) issueData.lat = parseFloat(lat);
      if (lng) issueData.lng = parseFloat(lng);

      // Single old image support
      if (req.files?.image?.[0]) {
        issueData.imageUrl = '/uploads/' + req.files.image[0].filename;
      }

      // Multiple images
      if (req.files?.images) {
        issueData.images = req.files.images.map(
          (file) => '/uploads/' + file.filename
        );
      }

      // Map images
      if (req.files?.mapImages) {
        issueData.mapImages = req.files.mapImages.map(
          (file) => '/uploads/' + file.filename
        );
      }

      // PDFs
      if (req.files?.pdfs) {
        issueData.pdfs = req.files.pdfs.map(
          (file) => '/uploads/' + file.filename
        );
      }

      let savedIssue;

      if (Issue) {
        const issue = new Issue(issueData);
        savedIssue = await issue.save();
      } else {
        issueData._id = Date.now().toString();
        issuesStore.push(issueData);
        savedIssue = issueData;
      }

      console.log('Issue saved successfully:', savedIssue);
      res.status(201).json(savedIssue);
    } catch (err) {
      console.error('Error creating issue:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE issue
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (Issue) {
      await Issue.findByIdAndDelete(id);
    } else {
      issuesStore = issuesStore.filter((issue) => issue._id !== id);
    }

    res.json({ message: 'Issue deleted successfully' });
  } catch (err) {
    console.error('Error deleting issue:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE full issue
router.put(
  '/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
    { name: 'mapImages', maxCount: 10 },
    { name: 'pdfs', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log('Received PUT request to /api/issues/' + id);
      console.log('Body:', req.body);
      console.log('Files:', req.files);

      const {
        title,
        category,
        description,
        district,
        lat,
        lng,
        status,
      } = req.body;

      const existingImages = parseArray(req.body.existingImages);
      const existingMapImages = parseArray(req.body.existingMapImages);
      const existingPdfs = parseArray(req.body.existingPdfs);

      const newImages = req.files?.images
        ? req.files.images.map((file) => '/uploads/' + file.filename)
        : [];

      const newMapImages = req.files?.mapImages
        ? req.files.mapImages.map((file) => '/uploads/' + file.filename)
        : [];

      const newPdfs = req.files?.pdfs
        ? req.files.pdfs.map((file) => '/uploads/' + file.filename)
        : [];

      const updateData = {};

      if (title !== undefined) updateData.title = title;
      if (category !== undefined) updateData.category = category;
      if (description !== undefined) updateData.description = description;
      if (district !== undefined) updateData.district = district;
      if (status !== undefined) updateData.status = status;
      if (lat !== undefined && lat !== '') updateData.lat = parseFloat(lat);
      if (lng !== undefined && lng !== '') updateData.lng = parseFloat(lng);

      updateData.images = [...existingImages, ...newImages];
      updateData.mapImages = [...existingMapImages, ...newMapImages];
      updateData.pdfs = [...existingPdfs, ...newPdfs];

      // old single image support
      if (req.files?.image?.[0]) {
        updateData.imageUrl = '/uploads/' + req.files.image[0].filename;
      }

      updateData.updatedAt = new Date();

      let updatedIssue;

      if (Issue) {
        updatedIssue = await Issue.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
        });
      } else {
        const index = issuesStore.findIndex((issue) => issue._id === id);

        if (index !== -1) {
          issuesStore[index] = {
            ...issuesStore[index],
            ...updateData,
          };

          updatedIssue = issuesStore[index];
        }
      }

      if (!updatedIssue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      console.log('Issue updated successfully:', updatedIssue);
      res.json(updatedIssue);
    } catch (err) {
      console.error('Error updating issue:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;