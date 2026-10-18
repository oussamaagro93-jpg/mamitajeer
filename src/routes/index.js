const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/products', require('./product'));
router.use('/categories', require('./category'));
router.use('/brands', require('./brand'));
router.use('/orders', require('./order'));
router.use('/customers', require('./customer'));
router.use('/inventory', require('./inventory'));
router.use('/coupons', require('./coupon'));
router.use('/users', require('./user'));
router.use('/dashboard', require('./dashboard'));
router.use('/checkout', require('./checkout'));
router.use('/delivery-companies', require('./delivery-companies'));
router.use('/wilayas', require('./wilayas'));
router.use('/shipping-rates', require('./shipping-rates'));
router.use('/public', require('./public'));
router.use('/warehouses', require('./warehouse'));
router.use('/meta', require('./meta'));

module.exports = router;
