import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://ai-risk-agent.onrender.com').replace(/\/$/, '');

const initialSession = {
  time_spent_sec: 20,
  page_stage: 'home',
  device_type: 'android',
  delivery_zone: 'remote',
  cart_value: 0,
  cart_items_count: 0,
  delivery_eta_days: 2,
  coupon_status: 'none',
  is_returning_user: 0,
  idle_seconds: 0,
};

const featuredProducts = [
  { name: 'Trail Runner Pro', price: 1800, tag: 'Best seller' },
  { name: 'Cloud Knit Sneakers', price: 1499, tag: 'Lightweight' },
  { name: 'City Pace Trainers', price: 2199, tag: 'New drop' },
];

function App() {
  const [page, setPage] = useState('home');
  const [session, setSession] = useState(initialSession);
  const [selectedEta, setSelectedEta] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [aiResult, setAiResult] = useState(null);
  const [isApplyingOffer, setIsApplyingOffer] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSession((current) => ({
        ...current,
        time_spent_sec: current.time_spent_sec + 1,
        idle_seconds: current.idle_seconds + 1,
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          setAiResult(data);
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setAiResult({
            error: 'Unable to reach the analysis API right now.',
          });
        }
      });

    return () => controller.abort();
  }, [session]);

  const riskScore = aiResult?.risk?.risk_score ?? 0;
  const riskPercent = Math.round(riskScore * 100);

  const riskLevel = useMemo(() => {
    if (riskScore >= 0.7) return 'High';
    if (riskScore >= 0.4) return 'Medium';
    return 'Low';
  }, [riskScore]);

  const reasonEntries = Object.entries(aiResult?.reasons ?? {});

  const updateSession = (changes, message = '') => {
    setSession((current) => ({
      ...current,
      ...changes,
      idle_seconds: 0,
    }));

    if (message) {
      setStatusMessage(message);
      window.setTimeout(() => setStatusMessage(''), 1800);
    }
  };

  const goToPage = (nextPage, changes = {}) => {
    setPage(nextPage);
    updateSession({ page_stage: nextPage, ...changes });
  };

  const handleApplyOffer = () => {
    if (!aiResult?.offer) return;

    setIsApplyingOffer(true);

    const nextSession = { ...session };

    if (aiResult.offer.action === 'express_delivery') {
      nextSession.delivery_eta_days = 1;
    }

    if (aiResult.offer.action === 'coupon') {
      nextSession.coupon_status = 'applied';
      nextSession.cart_value = Math.max(0, nextSession.cart_value - 100);
    }

    nextSession.idle_seconds = 0;
    setSession(nextSession);
    setStatusMessage('Risk reduced');
    window.setTimeout(() => setStatusMessage(''), 1800);

    window.setTimeout(() => {
      setIsApplyingOffer(false);
    }, 500);
  };

  const renderLeftContent = () => {
    switch (page) {
      case 'product':
        return (
          <section className="content-card product-page">
            <button className="ghost-link" onClick={() => goToPage('home')}>Back</button>
            <div className="product-feature">
              <div className="product-visual">
                <span>Running Shoes</span>
              </div>
              <div className="product-copy">
                <p className="eyebrow">Featured product</p>
                <h1>Running Shoes</h1>
                <p className="price">₹1800</p>
                <p className="muted">Comfortable everyday running shoes built for long sessions and fast checkouts.</p>
                <div className="button-row">
                  <button
                    className="primary-button"
                    onClick={() => {
                      setPage('cart');
                      updateSession(
                        {
                          page_stage: 'cart',
                          cart_value: 1800,
                          cart_items_count: 2,
                        },
                        'Added to cart',
                      );
                    }}
                  >
                    Add to cart
                  </button>
                  <button className="secondary-button" onClick={() => goToPage('home')}>Back</button>
                </div>
              </div>
            </div>
          </section>
        );
      case 'cart':
        return (
          <section className="content-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Your cart</p>
                <h1>Cart</h1>
              </div>
              <button className="ghost-link" onClick={() => goToPage('product')}>Back</button>
            </div>
            <div className="cart-list">
              <article className="cart-item">
                <div>
                  <h3>Running Shoes</h3>
                  <p className="muted">Qty 2</p>
                </div>
                <strong>₹1800</strong>
              </article>
            </div>
            <div className="cart-summary">
              <div>
                <span className="muted">Cart total</span>
                <h2>₹{session.cart_value}</h2>
              </div>
              <label className="field">
                <span>Delivery ETA</span>
                <select
                  value={selectedEta}
                  onChange={(event) => {
                    const eta = Number(event.target.value);
                    setSelectedEta(eta);
                    updateSession({ delivery_eta_days: eta }, 'Delivery estimate updated');
                  }}
                >
                  <option value={2}>2 days</option>
                  <option value={4}>4 days</option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" onClick={() => goToPage('checkout', { delivery_eta_days: selectedEta })}>
                Proceed to checkout
              </button>
              <button className="secondary-button" onClick={() => goToPage('product')}>Continue shopping</button>
            </div>
          </section>
        );
      case 'checkout':
        return (
          <section className="content-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Checkout</p>
                <h1>Checkout</h1>
              </div>
              <button className="ghost-link" onClick={() => goToPage('cart')}>Back</button>
            </div>
            <div className="payment-grid">
              {['upi', 'card', 'cod'].map((method) => (
                <button
                  key={method}
                  className={paymentMethod === method ? 'payment-option active' : 'payment-option'}
                  onClick={() => {
                    setPaymentMethod(method);
                    updateSession({ page_stage: 'checkout' });
                  }}
                >
                  {method === 'upi' ? 'UPI' : method === 'card' ? 'Card' : 'Cash on delivery'}
                </button>
              ))}
            </div>
            <div className="checkout-card">
              <p className="muted">Selected payment</p>
              <strong>{paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'Card' : 'Cash on delivery'}</strong>
              <p className="muted">Total payable ₹{session.cart_value}</p>
            </div>
            <button className="primary-button wide" onClick={() => updateSession({ page_stage: 'checkout' }, 'Order placed in demo mode')}>
              Place Order
            </button>
          </section>
        );
      default:
        return (
          <section className="content-card home-page">
            <div className="hero-row">
              <div>
                <p className="logo-mark">ARC</p>
                <p className="eyebrow">Demo store</p>
                <h1>Simple checkout journey</h1>
                <p className="muted">Use this flow to show how the live AI panel reacts as the customer moves from browse to buy.</p>
              </div>
              <button className="primary-button" onClick={() => goToPage('product')}>View Product</button>
            </div>

            <label className="search-bar">
              <span className="search-icon">⌕</span>
              <input type="text" placeholder="Search shoes, accessories, and more" />
            </label>

            <div className="featured-grid">
              {featuredProducts.map((product) => (
                <article className="featured-card" key={product.name}>
                  <span className="pill">{product.tag}</span>
                  <h3>{product.name}</h3>
                  <p className="muted">₹{product.price}</p>
                  <button className="secondary-button" onClick={() => goToPage('product')}>View Product</button>
                </article>
              ))}
            </div>
          </section>
        );
    }
  };

  return (
    <div className="app-shell">
      <div className="journey-column">
        <header className="topbar">
          <div className="brand-block">
            <p className="brand-kicker">Storefront</p>
            <h2>Recovery Demo</h2>
          </div>
          <div className="nav-steps">
            {['home', 'product', 'cart', 'checkout'].map((step) => (
              <button
                key={step}
                className={page === step ? 'step-chip active' : 'step-chip'}
                onClick={() => goToPage(step, { page_stage: step })}
              >
                {step}
              </button>
            ))}
          </div>
        </header>

        {renderLeftContent()}

        <div className="session-strip content-card">
          <div>
            <span className="muted">Session time</span>
            <strong>{session.time_spent_sec}s</strong>
          </div>
          <div>
            <span className="muted">Idle</span>
            <strong>{session.idle_seconds}s</strong>
          </div>
          <div>
            <span className="muted">Cart items</span>
            <strong>{session.cart_items_count}</strong>
          </div>
          <div>
            <span className="muted">ETA</span>
            <strong>{session.delivery_eta_days} days</strong>
          </div>
        </div>
      </div>

      <aside className="agent-panel">
        <div className="agent-card">
          <p className="eyebrow">AI Conversion Agent</p>
          <h2>AI Conversion Agent</h2>
          <div className="risk-meter-track" aria-hidden="true">
            <span className="risk-meter-fill" style={{ width: `${Math.min(100, Math.max(4, riskPercent))}%` }} />
          </div>
          <div className="agent-meta">
            <div>
              <span className="muted">Current Page</span>
              <strong>{page}</strong>
            </div>
            <div>
              <span className="muted">Risk score</span>
              <strong>{riskPercent}%</strong>
            </div>
            <div>
              <span className="muted">Risk level</span>
              <strong className={`risk-badge ${riskLevel.toLowerCase()}`}>{riskLevel}</strong>
            </div>
          </div>

          <div className="insight-block">
            <h3>Top reasons</h3>
            {reasonEntries.length > 0 ? (
              <ul className="reason-list">
                {reasonEntries.map(([key, value]) => (
                  <li key={key}>
                    <span>{key.replaceAll('_', ' ')}</span>
                    <strong>{Number(value).toFixed(2)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Waiting for API response...</p>
            )}
          </div>

          <div className="offer-card">
            <h3>Offer</h3>
            <p className="offer-message">
              {aiResult?.offer?.message ?? 'No offer yet. The agent will suggest one as the session updates.'}
            </p>
            <button className="primary-button wide" onClick={handleApplyOffer} disabled={!aiResult?.offer || isApplyingOffer}>
              {isApplyingOffer ? 'Applying...' : 'Apply Offer'}
            </button>
          </div>

          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

          <div className="raw-session">
            <h3>Session data</h3>
            <pre>{JSON.stringify(session, null, 2)}</pre>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default App;