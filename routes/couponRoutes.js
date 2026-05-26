import express from "express";
import {
  createCoupon,
  getCoupons
} from "../../controllers/admin/coupon.controller.js";

const router = express.Router();

router.post("/create", createCoupon);
router.get("/", getCoupons);

export default router;