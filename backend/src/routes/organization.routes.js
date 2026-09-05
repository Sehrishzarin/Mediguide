const express = require('express');
const {
  getAllOrganizations,
  getNearbyOrganizations,
  createOrganization,
  addOrganizationReview
} = require('../controllers/organization.controller');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/nearby', getNearbyOrganizations);
router.get('/', getAllOrganizations);
router.post('/:id/reviews', addOrganizationReview);
router.post('/', protect, authorize('admin', 'organization'), createOrganization);

module.exports = router;
