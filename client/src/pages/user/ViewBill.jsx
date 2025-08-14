import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../../components/user/Navbar";
import io from "socket.io-client";
import { Link } from "react-router-dom";
//เอาไว้ทำ modal
import toast from "react-hot-toast";
const socket = io("http://localhost:3000"); // เปลี่ยนตาม URL backend จริง

const ViewBill = ({ tableNumber: propTableNumber}) => {
  const { order_code } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // เอาไว้ดึงโต๊ะเวลาจะกดกลับหน้าหลัก
  const [tableNumber, setTableNumber] = useState(null);

  // เอาไว้ดึงเลขโต๊ะ
  useEffect(() => {
    // ใช้ prop ก่อน ถ้าไม่มี ค่อยดึงจาก localStorage
    if (propTableNumber) {
      setTableNumber(propTableNumber);
    } else {
      const storedTable = sessionStorage.getItem("table_number");
      setTableNumber(storedTable);
    }
  }, [propTableNumber]);

  // ดึงข้อมูล order ตอนแรก
  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/user/viewOrder-list/${order_code}`)
      .then((res) => setOrder(res.data))
      .catch(() => alert("❌ ไม่พบคำสั่งซื้อนี้"));
  }, [order_code]);

  // ฟัง event order_status_updated แบบ realtime
  useEffect(() => {
    const handleStatusUpdate = ({ orderId, status }) => {
      // เช็คว่า orderId ตรงกับ order ของ user หรือไม่
      if (order?.order?.order_id === orderId) {
        setOrder((prevOrder) => ({
          ...prevOrder,
          order: {
            ...prevOrder.order,
            status,
          },
        }));
        // toast.success(`สถานะคำสั่งซื้ออัปเดตเป็น: ${status}`);
      }
    };

    socket.on("order_status_updated", handleStatusUpdate);

    return () => {
      socket.off("order_status_updated", handleStatusUpdate);
    };
  }, [order]);

  const handleCancelOrder = async () => {
    setLoading(true);
    try {
      await axios.put(
        `http://localhost:3000/api/user/viewOrder-list/cancel-order/${order_code}`,
        {
          status: "cancelled",
        }
      );

      setOrder((prevOrder) => ({
        ...prevOrder,
        order: { ...prevOrder.order, status: "cancelled" },
      }));

      sessionStorage.removeItem("order_code");
      toast.error("ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว!");
      setShowCancelModal(false);
      navigate(`/user-menu/table/${order?.order?.table_number}`);
    } catch (error) {
      console.error("❌ ยกเลิกคำสั่งซื้อไม่สำเร็จ:", error);
      alert("❌ ไม่สามารถยกเลิกคำสั่งซื้อได้");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าได้รับอาหารครบถ้วนแล้ว?")) return;
    setLoading(true);
    try {
      await axios.put(
        `http://localhost:3000/api/user/confirm-order/${order_code}`,
        {
          status: "completed",
        }
      );
      setOrder((prevOrder) => ({
        ...prevOrder,
        order: { ...prevOrder.order, status: "completed" },
      }));
      alert("✅ ยืนยันการรับอาหารเรียบร้อยแล้ว");
    } catch (error) {
      console.error("❌ ยืนยันการรับอาหารไม่สำเร็จ:", error);
      alert("❌ ไม่สามารถยืนยันการรับอาหารได้");
    } finally {
      setLoading(false);
    }
  };

  if (!order) return <p className="text-center py-10">กำลังโหลด...</p>;

  const { order: orderInfo, items } = order;

  const formatPrice = (num) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(num);

  const statusMap = {
    pending: { text: "⏳ รอดำเนินการ", color: "bg-yellow-100 text-yellow-800" },
    preparing: {
      text: "👨‍🍳 กำลังเตรียมอาหาร",
      color: "bg-blue-100 text-blue-800",
    },
    ready: { text: "✅ พร้อมเสิร์ฟ", color: "bg-green-100 text-green-800" },
    completed: { text: "✔️ เสร็จสิ้น", color: "bg-green-100 text-green-800" },
    cancelled: { text: "❌ ยกเลิกแล้ว", color: "bg-red-100 text-red-800" },
  };

  const currentStatus = statusMap[orderInfo.status] || {
    text: "สถานะไม่ทราบ",
    color: "bg-gray-100 text-gray-800",
  };

  const canCancel = orderInfo.status === "pending";
  const canConfirm = orderInfo.status === "ready";
  const totalPrice = formatPrice(parseFloat(orderInfo.total_price) || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-xl relative">
          <div className="absolute top-4 right-4">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${currentStatus.color}`}
            >
              {currentStatus.text}
            </span>
          </div>
          <h2 className="text-3xl font-bold mb-2">🧾 ใบเสร็จรับเงิน</h2>
          <p className="text-lg text-orange-100 mb-4">
            รหัสคำสั่งซื้อ:{" "}
            <span className="font-semibold text-white">
              {orderInfo.order_id}
            </span>
          </p>
          <div className="flex flex-wrap md:flex-nowrap items-center justify-start gap-x-8 gap-y-2 mt-4 text-sm text-orange-100">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <span>📌</span> หมายเลขโต๊ะ: {orderInfo.table_number}
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <span>📅</span> วันที่/เวลา:{" "}
              {new Date(orderInfo.order_time).toLocaleString("th-TH")}
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="text-2xl font-bold text-orange-800 mb-6 text-center">
            🍽️ รายการอาหารที่สั่ง
          </h3>
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-lg border border-orange-100 overflow-hidden"
            >
              <div className="flex items-center p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {i + 1}
                </div>
                <div className="flex-1 ml-6">
                  <h4 className="text-xl font-bold text-orange-800 mb-2">
                    {item.menu_name}
                  </h4>
                  <div className="flex gap-6 text-sm text-gray-600">
                    <div className="flex gap-1">
                      <span className="text-orange-500">🍽️</span> จำนวน:{" "}
                      <span className="font-semibold text-orange-700">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <span className="text-orange-500">💰</span> ราคาต่อหน่วย:{" "}
                      <span className="font-semibold text-orange-700">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">รวม</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-xl border-2 border-orange-200">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
            <h3 className="text-xl font-bold text-center">💸 สรุปยอดรวม</h3>
          </div>
          <div className="p-6">
            <div className="flex justify-between mb-4">
              <span className="text-lg text-gray-600">จำนวนรายการ:</span>
              <span className="text-lg font-semibold text-orange-700">
                {items.length} รายการ
              </span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-lg text-gray-600">จำนวนทั้งหมด:</span>
              <span className="text-lg font-semibold text-orange-700">
                {items.reduce((sum, item) => sum + item.quantity, 0)} หน่วย
              </span>
            </div>
            <div className="border-t-2 border-orange-200 pt-4">
              <div className="flex justify-between">
                <span className="text-2xl font-bold text-orange-800">
                  ยอดรวมทั้งหมด:
                </span>
                <span className="text-3xl font-bold text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
                  {totalPrice}
                </span>
              </div>
            </div>
          </div>
        </div>

        {(canCancel || canConfirm) && (
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            {canCancel ? (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={loading}
                className={`${
                  loading
                    ? "bg-red-300 cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600"
                } text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                {loading ? "กำลังยกเลิก..." : "❌ ยกเลิกคำสั่งซื้อ"}
              </button>
            ) : (
              <>
                <button
                  disabled
                  className="bg-red-300 cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl shadow-lg"
                >
                  ❌ ยกเลิกคำสั่งซื้อ
                </button>

                <p className="text-sm text-red-600 mt-2 text-center">
                  ไม่สามารถยกเลิกคำสั่งซื้อได้ในสถานะนี้
                </p>
              </>
            )}

            {canConfirm && (
              <button
                onClick={handleConfirmOrder}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {loading ? "กำลังยืนยัน..." : "✅ ยืนยันรับอาหารแล้ว"}
              </button>
            )}
          </div>
        )}
        <div className="flex justify-center mt-4">
          <Link
            to={`/user-menu/table/${tableNumber}`}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            หน้าหลัก
          </Link>
        </div>

        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl max-w-sm w-full shadow-xl">
              <h2 className="text-xl font-bold text-red-600 text-center mb-4">
                ⚠️ ยืนยันการยกเลิก
              </h2>
              <p className="text-gray-700 text-center mb-6">
                คุณแน่ใจหรือไม่ว่าต้องการ{" "}
                <span className="font-semibold">ยกเลิกคำสั่งซื้อ</span> นี้?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={loading}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={async () => {
                    await handleCancelOrder();
                    setShowCancelModal(false);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  disabled={loading}
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-8 p-6 bg-white/50 backdrop-blur-sm rounded-xl">
          <div className="text-lg font-semibold text-orange-700 mb-2">
            🙏 ขอบคุณที่ใช้บริการ
          </div>
          <div className="text-sm text-orange-600">
            Thank you for your order • หวังว่าจะได้รับใช้อีกครั้ง
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBill;
