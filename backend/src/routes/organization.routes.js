const express = require('express');
const {
  getAllOrganizations,
  getNearbyOrganizations,
  createOrganization
} = require('../controllers/organization.controller');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/nearby', getNearbyOrganizations);
router.get('/', getAllOrganizations);
router.post('/', protect, authorize('admin', 'organization'), createOrganization);

module.exports = router;
