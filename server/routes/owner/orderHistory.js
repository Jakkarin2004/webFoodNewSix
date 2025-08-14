const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const { verifyToken, isOwner } = require("../../middleware/auth");

// Middleware ตรวจสอบ token และสิทธิ์เจ้าของร้าน
router.use(verifyToken, isOwner);

// ดึงออเดอร์ทั้งหมด (ไม่จำกัดวันที่)
// router.get("/all", verifyToken, isOwner, async (req, res) => {
//   try {
//     const [rows] = await db.promise().query(
//       `SELECT * FROM orders ORDER BY order_time DESC`
//     );

//     res.json({ orders: rows });
//   } catch (error) {
//     console.error("🔥 เกิดข้อผิดพลาดใน backend:", error);
//     res.status(500).json({ message: "เกิดข้อผิดพลาดในฝั่งเซิร์ฟเวอร์" });
//   }
// });

router.get("/all", verifyToken, isOwner, async (req, res) => {
  try {
    // ดึงออเดอร์ทั้งหมด
    const [orders] = await db.promise().query(
      `SELECT * FROM orders ORDER BY order_time DESC`
    );

    // ดึงรายการอาหารทั้งหมดของทุกออเดอร์ พร้อมชื่อเมนู
    const [orderItems] = await db.promise().query(
      `SELECT oi.*, m.menu_name, m.price 
       FROM order_items oi
       JOIN menu m ON oi.menu_id = m.menu_id`
    );

    // รวมข้อมูล: ผูก orderItems กับแต่ละ order ตาม order_id
    const ordersWithDetails = orders.map(order => {
      const items = orderItems.filter(item => item.order_id === order.order_id);
      return {
        ...order,
        items: items
      };
    });

    res.json({ orders: ordersWithDetails });
  } catch (error) {
    console.error("🔥 เกิดข้อผิดพลาดใน backend:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในฝั่งเซิร์ฟเวอร์" });
  }
});


module.exports = router;
