const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// Guard all employee management endpoints with Admin/Superadmin
router.use(authenticateUser, requireRole(ROLES.ADMIN, ROLES.SUPERADMIN));

router.get('/', employeeController.getEmployees);
router.post('/', employeeController.createEmployee);
router.get('/:id', employeeController.getEmployeeById);
router.patch('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;

