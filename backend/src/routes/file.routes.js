const express = require('express');
const multer = require('multer');
const { uploadFile, listFiles, downloadFile, deleteFile } = require('../controllers/file.controller');
const { protect } = require('../middlewares/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

router.use(protect);

router.get('/', listFiles);
router.post('/', upload.single('file'), uploadFile);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

module.exports = router;
