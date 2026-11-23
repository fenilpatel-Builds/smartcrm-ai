import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import * as companyController from '../controllers/companyController.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.get('/metrics', companyController.getCompanyMetrics);
router.get('/', companyController.getCompanies);
router.post('/', companyController.createCompany);
router.get('/:id', companyController.getCompanyById);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

export default router;
