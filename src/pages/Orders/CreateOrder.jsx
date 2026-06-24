import { useEffect, useState } from "react";
import { authFetch } from "../../utils/authFetch";
import toast, { Toaster } from "react-hot-toast";
import styles from "./CreateOrder.module.css";
import SignaturePad from "../../components/SignaturePad";
import { BACKEND_URL } from "../../config";
import { useNavigate } from "react-router-dom";

export default function CreateOrder() {
  /* =====================
     Helpers
  ===================== */
  const GST_RATE = 0.18;
  const toPaise = (r) => Math.round(r * 100);
  const toRupees = (p) => (p / 100).toFixed(2);
  const [signature, setSignature] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletUse, setWalletUse] = useState(0);
  const [useMaxWallet, setUseMaxWallet] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);

  // const formatINR = (amount) =>
  //   new Intl.NumberFormat("en-IN", {
  //     style: "currency",
  //     currency: "INR",
  //     minimumFractionDigits: 2,
  //   }).format(amount);

  const formatINR = (amount = 0) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(Number(amount) || 0);
  /* =====================
     Products
  ===================== */
  const [allProducts, setAllProducts] = useState([]);
  const [productQuery, setProductQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  /* =====================
     Customers
  ===================== */
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [fullPaid, setFullPaid] = useState(true);
  const [draftLoaded, setDraftLoaded] = useState(false);
  /* =====================
     Cart
  ===================== */
  const [cart, setCart] = useState([]);

  /* =====================
     Totals
  ===================== */
  const [applyGST, setApplyGST] = useState(true);
  const [subtotalPaise, setSubtotalPaise] = useState(0);
  const [calculatedTotalPaise, setCalculatedTotalPaise] = useState(0);
  const [grandTotalPaise, setGrandTotalPaise] = useState(0);
  const [grandTotalInput, setGrandTotalInput] = useState("0.00");
  const [manualTotal, setManualTotal] = useState(false);

  const [paidAmount, setPaidAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);

  /* =====================
     Initial Fetch
  ===================== */
  // useEffect(() => {
  //   fetchProducts();
  //   fetchCustomers();
  // }, []);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();

    const draft = localStorage.getItem("orderDraft");

    if (draft) {
      const data = JSON.parse(draft);

      setSelectedCustomer(data.selectedCustomer ?? null);
      setCustomerQuery(data.customerQuery ?? "");
      setFilteredCustomers(data.filteredCustomers ?? []);

      setProductQuery(data.productQuery ?? "");
      setFilteredProducts(data.filteredProducts ?? []);

      setCart(data.cart ?? []);

      setWalletBalance(data.walletBalance ?? 0);
      setWalletUse(data.walletUse ?? 0);
      setUseMaxWallet(data.useMaxWallet ?? false);

      setApplyGST(data.applyGST ?? true);

      setSubtotalPaise(data.subtotalPaise ?? 0);
      setCalculatedTotalPaise(data.calculatedTotalPaise ?? 0);
      setGrandTotalPaise(data.grandTotalPaise ?? 0);
      setGrandTotalInput(data.grandTotalInput ?? "0.00");
      setManualTotal(data.manualTotal ?? false);

      setPaidAmount(data.paidAmount ?? "");
      setFullPaid(data.fullPaid ?? true);

      setSignature(data.signature ?? null);
    }

    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    const max = Math.min(walletBalance, grandTotalPaise / 100);

    if (useMaxWallet) {
      setWalletUse(max);
    } else {
      // Clamp manual value
      if (walletUse > max) {
        setWalletUse(max);
      }
    }
  }, [walletBalance, grandTotalPaise, useMaxWallet]);

  useEffect(() => {
    if (fullPaid) {
      const total = grandTotalPaise / 100;
      const payable = total - walletUse;

      setPaidAmount(payable.toFixed(2)); // ✅ FIX
    }
  }, [fullPaid, grandTotalPaise, walletUse]);

  useEffect(() => {
    if (!draftLoaded) return;

    localStorage.setItem(
      "orderDraft",
      JSON.stringify({
        selectedCustomer,
        customerQuery,
        filteredCustomers,

        productQuery,
        filteredProducts,

        cart,

        walletBalance,
        walletUse,
        useMaxWallet,

        applyGST,

        subtotalPaise,
        calculatedTotalPaise,
        grandTotalPaise,
        grandTotalInput,
        manualTotal,

        paidAmount,
        fullPaid,

        signature,
      }),
    );
  }, [
    draftLoaded,

    selectedCustomer,
    customerQuery,
    filteredCustomers,

    productQuery,
    filteredProducts,

    cart,

    walletBalance,
    walletUse,
    useMaxWallet,

    applyGST,

    subtotalPaise,
    calculatedTotalPaise,
    grandTotalPaise,
    grandTotalInput,
    manualTotal,

    paidAmount,
    fullPaid,

    signature,
  ]);
  /* ===================== AUTO WALLET ===================== */

  const fetchProducts = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/product`);
      setAllProducts(await res.json());
    } catch {
      toast.error("Failed to load products");
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await authFetch(`${BACKEND_URL}/customer`);
      setAllCustomers(await res.json());
    } catch {
      toast.error("Failed to load customers");
    }
  };

  /* =====================
     Local Search
  ===================== */
  const searchCustomers = (q) => {
    setCustomerQuery(q);
    if (!q.trim()) return setFilteredCustomers([]);

    const v = q.toLowerCase();
    setFilteredCustomers(
      allCustomers.filter(
        (c) =>
          c.custName.toLowerCase().includes(v) ||
          (c.phone && c.phone.includes(v)),
      ),
    );
  };

  const searchProducts = (q) => {
    setProductQuery(q);
    if (!q.trim()) return setFilteredProducts([]);

    const v = q.toLowerCase();
    setFilteredProducts(
      allProducts.filter((p) => p.name.toLowerCase().includes(v)),
    );
  };

  /* =====================
     Cart Logic (NO LOSS)
  ===================== */
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product === product.id);

      if (existing) {
        if (product.trackStock && existing.qty + 1 > product.stock) {
          toast.error(`Only ${product.stock} ${product.name} left`);
          return prev;
        }
        return prev.map((i) =>
          i.product === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }

      if (product.trackStock && product.stock <= 0) {
        toast.error(`${product.name} out of stock`);
        return prev;
      }

      return [
        ...prev,
        {
          product: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
        },
      ];
    });
  };

  const incrementQty = (id) => {
    const product = allProducts.find((p) => p.id === id);
    const item = cart.find((i) => i.product === id);

    if (product.trackStock && item.qty + 1 > product.stock) {
      toast.error(`Only ${product.stock} ${product.name} left`);
      return;
    }

    updateQty(id, item.qty + 1);
  };

  const decrementQty = (id) => {
    const item = cart.find((i) => i.product === id);
    updateQty(id, item.qty - 1);
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.product !== id));
    else
      setCart((prev) =>
        prev.map((i) => (i.product === id ? { ...i, qty } : i)),
      );
  };

  /* =====================
     Totals Calculation
  ===================== */
  useEffect(() => {
    const subtotal = cart.reduce((s, i) => s + toPaise(i.price) * i.qty, 0);

    setSubtotalPaise(subtotal);

    const baseTotal = applyGST
      ? subtotal + Math.round(subtotal * GST_RATE)
      : subtotal;

    setCalculatedTotalPaise(baseTotal);

    if (!manualTotal) {
      setGrandTotalPaise(baseTotal);
      setGrandTotalInput(toRupees(baseTotal));
    }
  }, [cart, applyGST, manualTotal]);

  useEffect(() => {
    setManualTotal(false);
  }, [cart]);

  const adjustmentPaise = grandTotalPaise - calculatedTotalPaise;
  const extraChargesPaise = adjustmentPaise > 0 ? adjustmentPaise : 0;
  const discountPaise = adjustmentPaise < 0 ? Math.abs(adjustmentPaise) : 0;

  const totalModified = grandTotalPaise !== calculatedTotalPaise;

  const resetForm = () => {
    // Customer
    setSelectedCustomer(null);
    setCustomerQuery("");
    setFilteredCustomers([]);

    // Products
    setProductQuery("");
    setFilteredProducts([]);

    // Cart
    setCart([]);

    // Wallet
    setWalletUse(0);
    setWalletBalance(0);
    setUseMaxWallet(false);

    // Signature
    setSignature(null);
    setShowSignModal(false);

    // Totals
    setSubtotalPaise(0);
    setCalculatedTotalPaise(0);
    setGrandTotalPaise(0);
    setGrandTotalInput("0.00");
    setManualTotal(false);

    // Payment
    setPaidAmount("");
    setFullPaid(true);

    // GST
    setApplyGST(true);

    localStorage.removeItem("orderDraft");
  };

  /* =====================
     Submit Order
  ===================== */
  const submitOrder = async () => {
    if (!selectedCustomer) return toast.error("Customer required");
    if (cart.length === 0) return toast.error("Cart empty");

    const safeWallet = Math.min(walletUse, walletBalance);

    setLoading(true);
    const toastId = toast.loading("Creating order...");

    try {
      const payload = {
        customerId: selectedCustomer.id,

        items: cart.map((i) => ({
          product: i.product,
          name: i.name,
          qty: i.qty,
          price: i.price,
          total: i.price * i.qty,
        })),
        walletUsed: safeWallet,

        subTotal: subtotalPaise / 100,
        gstPercent: applyGST ? 18 : 0,
        gstAmount: (calculatedTotalPaise - subtotalPaise) / 100,

        extraCharges: extraChargesPaise / 100,
        discount: discountPaise / 100,

        totalAmount: grandTotalPaise / 100,
        paidAmount: Number(paidAmount || 0),
        signature,
      };

      const res = await authFetch(`${BACKEND_URL}/order/createOrder`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Order failed");

      toast.success("Order created");

      resetForm();

      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      toast.dismiss(toastId);
      setLoading(false);
    }
  };

  const remainingWallet = walletBalance - walletUse;
  const maxWalletUsable = Math.min(walletBalance, grandTotalPaise / 100);

  const payableAmount = grandTotalPaise / 100 - walletUse;

  const balanceAmount = Math.max(payableAmount - Number(paidAmount || 0), 0);

  const advanceAmount = Math.max(Number(paidAmount || 0) - payableAmount, 0);

  /* =====================
     Render
  ===================== */
  return (
    <div className={styles.container}>
      <Toaster position="top-right" />

      <div className={styles["orders-header"]}>
        <h2 className={styles.title}>Create Order </h2>

        <button
          className={styles.btnDashboard}
          onClick={() => navigate("/admin/dashboard")}
        >
          Dashboard
        </button>
      </div>

      {/* ================= CUSTOMER ================= */}
      <h3 className={styles.sectionTitle}>Customer</h3>

      {!selectedCustomer ? (
        <>
          <div className={styles.searchWrapper}>
            <input
              className={styles.searchInput}
              placeholder="Search customer..."
              value={customerQuery}
              onChange={(e) => searchCustomers(e.target.value)}
              autoFocus
            />

            {customerQuery && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setCustomerQuery("");
                  setFilteredCustomers([]);
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div>
            {filteredCustomers.map((c) => (
              <div
                className={styles.listItem}
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c);
                  setWalletBalance(c.walletBalance || 0);
                  setFilteredCustomers([]);
                  setCustomerQuery("");
                }}
              >
                <strong>{c.custName}</strong> — {c.phone}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.listItem}>
          <strong>{selectedCustomer.custName}</strong>
          <button onClick={() => setSelectedCustomer(null)}>Change</button>
        </div>
      )}

      {/* <div>
        <p>Wallet Balance: ₹{walletBalance}</p>

        <input
          type="number"
          placeholder="Use wallet amount"
          value={walletUse}
          // onChange={(e) => setWalletUse(Number(e.target.value))}
          onChange={(e) => {
            let value = Number(e.target.value);

            if (value < 0) value = 0;
            if (value > walletBalance) value = walletBalance;

            setWalletUse(value);
          }}
        />

        <p>
          Pay After Wallet: ₹{(grandTotalPaise / 100 - walletUse).toFixed(2)}
        </p>
      </div> */}

      <div className={styles.walletBox}>
        <div className={styles.walletTop}>
          <div>
            <p className={styles.walletLabel}>Customer Wallet</p>
            <h3 className={styles.walletBalance}>{formatINR(walletBalance)}</h3>
          </div>

          {walletBalance > 0 && (
            <span className={styles.walletBadge}>Available</span>
          )}
        </div>

        <div className={styles.walletInputRow}>
          <input
            type="number"
            placeholder="Enter amount"
            value={walletUse}
            onChange={(e) => {
              let value = Number(e.target.value);

              if (value < 0) value = 0;
              if (value > walletBalance) value = walletBalance;
              setUseMaxWallet(false); // 👈 IMPORTANT

              setWalletUse(value);
            }}
            className={styles.walletInput}
          />

          <button
            className={styles.walletMaxBtn}
            // onClick={() => {
            //   if (Math.abs(walletUse - maxWalletUsable) < 0.01) {
            //     setWalletUse(0); // remove
            //   } else {
            //     setWalletUse(maxWalletUsable); // use max
            //   }
            // }}

            onClick={() => {
              if (useMaxWallet) {
                setUseMaxWallet(false);
                setWalletUse(0);
              } else {
                setUseMaxWallet(true);
              }
            }}
          >
            {/* {Math.abs(walletUse - maxWalletUsable) < 0.01
              ? "Remove Wallet"
              : "Use Max"} */}

            {useMaxWallet ? "Remove Wallet" : "Use Max"}
          </button>
        </div>

        <div className={styles.walletSummary}>
          <div>
            <span>Using</span>
            <strong>{formatINR(walletUse)}</strong>
          </div>

          <div>
            <span>Remaining</span>
            <strong style={{ color: "#16a34a" }}>
              {formatINR(remainingWallet)}
            </strong>
          </div>

          <div>
            <span>Payable</span>
            <strong>{formatINR(grandTotalPaise / 100 - walletUse)}</strong>
          </div>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* ================= PRODUCTS ================= */}
      <h3 className={styles.sectionTitle}>Products</h3>

      <div className={styles.searchWrapper}>
        <input
          placeholder="Search product..."
          className={styles.searchInput}
          value={productQuery}
          onChange={(e) => searchProducts(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredProducts.length > 0) {
              addToCart(filteredProducts[0]);
              setProductQuery("");
              setFilteredProducts([]);
            }
          }}
        />

        {productQuery && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => {
              setProductQuery("");
              setFilteredProducts([]);
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div>
        {filteredProducts.slice(0, 6).map((p) => (
          <div
            key={p.id}
            className={styles.listItem}
            onClick={() => {
              addToCart(p);
              setProductQuery("");
              setFilteredProducts([]);
            }}
          >
            {p.name} — {formatINR(p.price)} • Stock:{" "}
            {p.trackStock ? p.stock : "∞"}
          </div>
        ))}
      </div>

      <hr className={styles.divider} />

      {/* ================= CART ================= */}
      <h3 className={styles.sectionTitle}>Cart</h3>

      <div className={styles.cartScroll}>
        {cart.map((item) => (
          <div key={item.product} className={styles.posItem}>
            {/* Top Row */}
            <div className={styles.posRowTop}>
              <span className={styles.posName}>{item.name}</span>

              <span className={styles.posTotal}>
                {formatINR(item.qty * item.price)}
              </span>
            </div>

            {/* Bottom Row */}
            <div className={styles.posRowBottom}>
              {/* Price */}
              <div className={styles.priceBox}>
                <span className={styles.priceSymbol}>₹</span>
                <input
                  type="number"
                  step="0.01"
                  className={styles.priceInput}
                  value={item.price}
                  onChange={(e) => {
                    const newPrice = Number(e.target.value);
                    setCart((prev) =>
                      prev.map((i) =>
                        i.product === item.product
                          ? { ...i, price: newPrice }
                          : i,
                      ),
                    );
                  }}
                />
              </div>

              {/* Quantity */}
              <div className={styles.qtyWrapper}>
                <button
                  className={styles.qtyBtn}
                  onClick={() => decrementQty(item.product)}
                >
                  −
                </button>

                <input
                  type="number"
                  min="1"
                  className={styles.qtyInput}
                  value={item.qty}
                  onChange={(e) =>
                    updateQty(item.product, Number(e.target.value))
                  }
                />

                <button
                  className={styles.qtyBtn}
                  onClick={() => incrementQty(item.product)}
                >
                  +
                </button>
              </div>

              {/* Remove */}
              <button
                className={styles.removeBtn}
                onClick={() =>
                  setCart((prev) =>
                    prev.filter((i) => i.product !== item.product),
                  )
                }
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <hr className={styles.divider} />

      {/* ================= SUMMARY ================= */}
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span>{formatINR(subtotalPaise / 100)}</span>
        </div>

        <div className={styles.summaryRow}>
          <span>Apply GST (18%)</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={applyGST}
              onChange={() => setApplyGST(!applyGST)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.summaryRow}>
          <span>GST</span>
          <span>{formatINR((calculatedTotalPaise - subtotalPaise) / 100)}</span>
        </div>

        {discountPaise > 0 && (
          <div className={styles.summaryRow} style={{ color: "green" }}>
            Discount − {formatINR(discountPaise / 100)}
          </div>
        )}

        {extraChargesPaise > 0 && (
          <div className={styles.summaryRow} style={{ color: "red" }}>
            Extra Charges + {formatINR(extraChargesPaise / 100)}
          </div>
        )}

        {/* <div className={styles.summaryRow}>
          <span>Grand Total</span>
          <input
            type="number"
            step="0.01"
            value={grandTotalInput}
            onChange={(e) => {
              setManualTotal(true);
              setGrandTotalInput(e.target.value);
              setGrandTotalPaise(toPaise(Number(e.target.value)));
            }}
          />
        </div> */}

        <div className={styles.summaryRow}>
          <span>Grand Total</span>

          <div className={styles.totalInputWrapper}>
            <input
              type="number"
              step="0.01"
              value={grandTotalInput}
              onChange={(e) => {
                setManualTotal(true);
                setGrandTotalInput(e.target.value);
                setGrandTotalPaise(toPaise(Number(e.target.value)));
              }}
            />

            {totalModified && (
              <button
                type="button"
                className={styles.resetTotalBtn}
                onClick={() => {
                  setManualTotal(false);
                  setGrandTotalPaise(calculatedTotalPaise);
                  setGrandTotalInput(toRupees(calculatedTotalPaise));
                }}
              >
                ↺
              </button>
            )}
          </div>
        </div>

        {walletUse > 0 && (
          <>
            <div className={styles.summaryRow}>
              <span>Wallet Used</span>
              <span style={{ color: "#4f46e5" }}>− {formatINR(walletUse)}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Wallet Remaining</span>
              <span style={{ color: "#16a34a" }}>
                {formatINR(walletBalance - walletUse)}
              </span>
            </div>
          </>
        )}

        <div className={styles.summaryRow}>
          <span className={styles.summaryStrong}>
            {walletUse > 0 ? "Payable After Wallet" : "Payable"}
          </span>

          <span className={styles.summaryStrong}>
            {formatINR(grandTotalPaise / 100 - walletUse)}
          </span>
        </div>

        {/* <div className={styles.summaryRow}>
          <span className={styles.summaryStrong}>Payable After Wallet</span>
          <span className={styles.summaryStrong}>
            ₹{(grandTotalPaise / 100 - walletUse).toFixed(2)}
          </span>
        </div> */}

        {/* <div className={styles.summaryRow}>
          <span className={styles.summaryStrong}>Final Total</span>
          {/* <span className={styles.summaryStrong}>
            ₹{toRupees(grandTotalPaise)}
          </span> */}
        {/* <span className={styles.summaryStrong}>
            ₹{(grandTotalPaise / 100 - walletUse).toFixed(2)}
          </span>
        </div> */}

        <div className={styles.summaryRow}>
          <span>Full Paid</span>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={fullPaid}
              onChange={(e) => {
                setFullPaid(e.target.checked);
                if (!e.target.checked) setPaidAmount("");
              }}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        {/* Small helper text */}
        <p className={styles.smallHint}>Off: extra goes to wallet</p>

        <div className={styles.summaryRow}>
          <span>Paid Amount</span>
          <input
            type="number"
            value={paidAmount}
            disabled={fullPaid}
            onChange={(e) => setPaidAmount(e.target.value)}
          />
        </div>

        {balanceAmount > 0 && (
          <div
            className={styles.summaryRow}
            style={{
              color: "#dc2626",
              fontWeight: "700",
              background: "#fef2f2",
              padding: "8px",
              borderRadius: "6px",
            }}
          >
            <span>Balance</span>
            <span>{formatINR(balanceAmount)}</span>
          </div>
        )}

        {advanceAmount > 0 && (
          <div
            className={styles.summaryRow}
            style={{
              color: "#16a34a",
              fontWeight: "700",
              background: "#f0fdf4",
              padding: "8px",
              borderRadius: "6px",
            }}
          >
            <span>Advance</span>
            <span>{formatINR(advanceAmount)}</span>
          </div>
        )}

        {/* {Number(paidAmount) > grandTotalPaise / 100 - walletUse && (
          <div className={styles.summaryRow} style={{ color: "green" }}>
            <span>Advance</span>
            <span>
              ₹
              {(
                Number(paidAmount) -
                (grandTotalPaise / 100 - walletUse)
              ).toFixed(2)}
            </span>
          </div>
        )} */}

        <div className={styles.signatureBox}>
          <div className={styles.signatureHeader}>
            <span className={styles.signatureTitle}>Customer Signature</span>

            {signature && (
              <span className={styles.signatureStatus}>Saved ✓</span>
            )}
          </div>

          <div className={styles.signatureCanvasWrapper}>
            <button
              className={styles.signatureOpenBtn}
              onClick={() => setShowSignModal(true)}
            >
              {signature ? "Re-sign" : "Add Signature"}
            </button>

            {signature && (
              <div className={styles.signaturePreview}>
                <img src={signature} alt="Signature" />
              </div>
            )}
          </div>
        </div>

        {/* <button
          className={styles.primaryBtn}
          onClick={submitOrder}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Order"}
        </button> */}

        <div className={styles.actionButtons}>
          <button
            className={styles.cancelBtn}
            onClick={() => setShowCancelModal(true)}
          >
            Cancel
          </button>

          <button
            className={styles.primaryBtn}
            onClick={submitOrder}
            disabled={loading}
          >
            {loading ? "Creating..." : "Order"}
          </button>
        </div>
      </div>
      {showSignModal && (
        <div className={styles.signModal}>
          <div className={styles.signModalContent}>
            <h3 className={styles.signHere}>Sign Here</h3>

            <SignaturePad
              onSave={(data) => {
                setSignature(data);
                setShowSignModal(false);
                toast.success("Signature saved");
              }}
            />

            <button
              className={styles.closeModal}
              onClick={() => setShowSignModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>Cancel Order?</h3>

            <p>
              All customer, cart, payment, wallet and signature data will be
              removed.
            </p>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => setShowCancelModal(false)}
              >
                Keep Order
              </button>

              <button
                className={styles.modalConfirm}
                onClick={() => {
                  resetForm();
                  setShowCancelModal(false);
                  toast.success("Order cancelled");
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
