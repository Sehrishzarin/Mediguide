const express = require('express');
const {
  getAllOrganizations,
  getNearbyOrganizations,
  addOrganizationReview,
  getMyOrganizations,
  createOrganization,
  addStaff,
  removeStaff,
  getPendingOrganizations,
  reviewOrganization
} = require('../controllers/organization.controller');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public
router.get('/nearby', getNearbyOrganizations);
router.get('/', getAllOrganizations);

// Admin
router.get('/admin/pending', protect, authorize('admin'), getPendingOrganizations);
router.put('/:id/status', protect, authorize('admin'), reviewOrganization);

// Organisation owners
router.get('/mine', protect, authorize('organization', 'admin'), getMyOrganizations);
router.post('/', protect, authorize('organization', 'admin'), createOrganization);
router.post('/:id/staff', protect, authorize('organization', 'admin'), addStaff);
router.delete('/:id/staff/:staffId', protect, authorize('organization', 'admin'), removeStaff);

// Signed-in patients
router.post('/:id/reviews', protect, authorize('user'), addOrganizationReview);

module.exports = router;
