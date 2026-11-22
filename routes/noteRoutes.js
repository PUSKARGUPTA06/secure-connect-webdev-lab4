const express = require('express');
const Note = require('../models/Note');
const appEmitter = require('../utils/eventEmitter');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply JWT authentication middleware to all /api/notes routes
router.use(verifyToken);

// @route   POST /api/notes
// @desc    Create a new personal note
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const note = await Note.create({
      title,
      content,
      owner: req.user.id
    });

    // Emit note creation event
    appEmitter.emit('noteCreated', note);

    return res.status(201).json(note);
  } catch (error) {
    return res.status(500).json({ message: 'Error creating note', error: error.message });
  }
});

// @route   GET /api/notes
// @desc    Get all notes belonging to the logged-in user
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find({ owner: req.user.id }).sort({ createdAt: 1 });
    return res.status(200).json(notes);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching notes', error: error.message });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update a note owned by the logged-in user
router.put('/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { title, content },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found or unauthorized' });
    }

    return res.status(200).json(note);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating note', error: error.message });
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete a note owned by the logged-in user
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found or unauthorized' });
    }

    return res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting note', error: error.message });
  }
});

module.exports = router;