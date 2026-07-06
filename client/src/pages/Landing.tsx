import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, Users, BarChart3, Shield, ArrowRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import Lightfall from '../components/effects/Lightfall';
import BorderGlow from '../components/ui/BorderGlow';

const features = [
  { icon: <Receipt size={28} />, title: 'Smart Receipt Scanning', desc: 'Upload receipts and let AI extract amounts, merchants, and dates automatically.' },
  { icon: <Users size={28} />, title: 'Workspace Collaboration', desc: 'Invite clients and team members to track shared expenses in real time.' },
  { icon: <BarChart3 size={28} />, title: 'Clear Summaries', desc: 'Get monthly breakdowns by status — approved, pending, and rejected at a glance.' },
  { icon: <Shield size={28} />, title: 'Privacy First', desc: 'Your data stays yours. No sharing, no ads, no tracking.' },
];

const slides = [
  { img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=90', title: 'Upload Receipts', desc: 'Snap a photo or upload a receipt. Drag-and-drop or choose from your device — it takes seconds.' },
  { img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=90', title: 'AI Reads Everything', desc: 'Our AI extracts amounts, merchants, dates, and categories automatically. No manual entry.' },
  { img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=90', title: 'Review & Approve', desc: 'Review extracted data, make quick edits, and organize expenses by project or workspace.' },
  { img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1600&q=90', title: 'Collaborate with Clients', desc: 'Share workspaces with clients. They can view, comment, and approve expenses in real time.' },
  { img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&q=90', title: 'Get Monthly Summaries', desc: 'See approved, pending, and rejected expenses at a glance. Clear summaries for tax time.' },
];

const Landing = () => {
  const [slideIdx, setSlideIdx] = useState(0);

  const next = useCallback(() => setSlideIdx((i) => (i + 1) % slides.length), []);
  const prev = useCallback(() => setSlideIdx((i) => (i - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  return (
  <div className="landing">
    <header className="landing-nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <img src="/logo.svg" alt="The Hive" className="nav-logo-img" />
          <span className="nav-brand-name">The Hive</span>
        </Link>
        <div className="nav-links">
          <Link to="/login" className="nav-link-text">Sign in</Link>
          <Link to="/signup" className="nav-cta-btn">Get started</Link>
        </div>
      </div>
    </header>

    <section className="hero-section">
      <div className="hero-bg">
        <Lightfall
          colors={['#5227FF', '#A6C8FF', '#FF9FFC']}
          backgroundColor="#0A29FF"
          speed={0.4}
          streakCount={4}
          streakWidth={0.8}
          streakLength={0.7}
          glow={0.8}
          density={0.4}
          twinkle={0.6}
          zoom={2.5}
          backgroundGlow={0.3}
          opacity={0.6}
          mouseInteraction={false}
          paused={false}
        />
      </div>
      <div className="hero-overlay" />
      <div className="hero">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>Expense tracking, reimagined</span>
        </div>
        <h1 className="hero-title">
          Track expenses with<br />
          <span className="hero-highlight">your clients,</span> not spreadsheets
        </h1>
        <p className="hero-subtitle">
          The Hive is a shared expense workspace for freelancers and businesses.
          Upload receipts, collaborate with clients, and get clear summaries — all in one place.
        </p>
        <div className="hero-actions">
          <Link to="/signup" className="hero-btn-primary">
            Start free
            <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="hero-btn-secondary">
            Sign in
          </Link>
        </div>
      </div>
    </section>

    <section className="carousel-section">
      <div className="carousel-label">How it works</div>
      <h2 className="carousel-title">From receipt to report in minutes</h2>
      <div className="carousel-viewport">
        <div className="carousel-track" style={{ transform: `translateX(-${slideIdx * 100}%)` }}>
          {slides.map((s, i) => (
            <div key={i} className="carousel-slide">
              <div className="carousel-slide-img-wrap">
                <img src={s.img} alt={s.title} className="carousel-slide-img" />
              </div>
              <div className="carousel-slide-body">
                <h3 className="carousel-slide-title">{s.title}</h3>
                <p className="carousel-slide-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <button className="carousel-btn carousel-btn-left" onClick={prev}><ChevronLeft size={20} /></button>
        <button className="carousel-btn carousel-btn-right" onClick={next}><ChevronRight size={20} /></button>
      </div>
      <div className="carousel-dots">
        {slides.map((_, i) => (
          <button key={i} className={`carousel-dot ${i === slideIdx ? 'active' : ''}`} onClick={() => setSlideIdx(i)} />
        ))}
      </div>
    </section>

    <section className="features">
      <div className="features-inner">
        <div className="features-label">Everything you need</div>
        <h2 className="features-title">Built for freelancers who work with clients</h2>
        <div className="features-grid">
          {features.map((f, i) => (
            <BorderGlow
              key={i}
              backgroundColor="#f4f4f8"
              borderRadius={16}
              edgeSensitivity={18}
              glowRadius={28}
              glowIntensity={1.8}
              fillOpacity={0.8}
              coneSpread={25}
              glowColor="210 100 60"
              colors={['#818cf8', '#f472b6', '#22d3ee']}
              className="feature-card"
            >
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </BorderGlow>
          ))}
        </div>
      </div>
    </section>

    <section className="cta-section">
      <div className="cta-card">
        <h2 className="cta-title">Ready to simplify your expenses?</h2>
        <p className="cta-subtitle">Join The Hive and take control of your shared finances.</p>
        <Link to="/signup" className="cta-btn">
          Get started free
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>

    <footer className="landing-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/logo.svg" alt="The Hive" className="footer-logo-img" />
          <span className="nav-brand-name" style={{ fontSize: 15 }}>The Hive</span>
        </div>
        <p className="footer-copy">&copy; {new Date().getFullYear()} The Hive. All rights reserved.</p>
      </div>
    </footer>

    <style>{`
      .landing {
        background: #ffffff;
        min-height: 100vh;
        font-family: 'Space Grotesk', sans-serif;
        color: hsl(240, 3%, 12%);
        overflow-x: hidden;
        --color-surface: #ffffff;
        --color-on-surface: hsl(240, 3%, 12%);
        --color-on-surface-variant: hsl(240, 2%, 48%);
        --color-surface-container: hsl(240, 8%, 95%);
        --color-outline-variant: hsl(240, 6%, 86%);
        --color-primary-container: hsl(210, 75%, 93%);
        --color-on-primary-container: hsl(210, 100%, 38%);
        --color-primary: hsl(210, 100%, 48%);
        --color-on-primary: hsl(0, 0%, 100%);
        --color-outline: hsl(240, 4%, 72%);
      }

      .landing-nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        background: var(--color-surface);
        border-bottom: 1px solid var(--color-outline-variant);
      }
      .nav-inner {
        max-width: 1100px;
        margin: 0 auto;
        padding: 0 24px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .nav-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
      }
      .nav-logo-img {
        height: 32px;
        width: auto;
      }
      .nav-brand-name {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 18px;
        font-weight: 700;
        color: var(--color-on-surface);
        letter-spacing: -0.3px;
      }
      .nav-links {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .nav-link-text {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-on-surface-variant);
        text-decoration: none;
        padding: 6px 14px;
        border-radius: 8px;
        transition: color 0.15s ease, background 0.15s ease;
      }
      .nav-link-text:hover {
        color: var(--color-on-surface);
        background: var(--color-surface-container);
      }
      .nav-cta-btn {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-on-primary);
        background: var(--color-primary);
        text-decoration: none;
        padding: 8px 18px;
        border-radius: 8px;
        transition: opacity 0.15s ease;
      }
      .nav-cta-btn:hover {
        opacity: 0.85;
      }

      .hero-section {
        position: relative;
        overflow: hidden;
      }
      .hero-bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
      }
      .hero-overlay {
        position: absolute;
        inset: 0;
        z-index: 1;
        background: linear-gradient(
          180deg,
          rgba(255,255,255,0.3) 0%,
          rgba(255,255,255,0.85) 40%,
          rgba(255,255,255,1) 100%
        );
        pointer-events: none;
      }
      .hero {
        position: relative;
        z-index: 2;
        max-width: 800px;
        margin: 0 auto;
        padding: 140px 24px 60px;
        text-align: center;
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: var(--color-primary-container);
        color: var(--color-on-primary-container);
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 32px;
      }
      .hero-title {
        font-size: clamp(36px, 5vw, 56px);
        font-weight: 700;
        line-height: 1.1;
        letter-spacing: -1.5px;
        color: var(--color-on-surface);
        margin-bottom: 24px;
      }
      .hero-highlight {
        color: var(--color-primary);
      }
      .hero-subtitle {
        font-size: 18px;
        line-height: 1.6;
        color: var(--color-on-surface-variant);
        max-width: 600px;
        margin: 0 auto 40px;
      }
      .hero-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }
      .hero-btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 28px;
        background: var(--color-primary);
        color: var(--color-on-primary);
        font-weight: 600;
        font-size: 16px;
        border-radius: 12px;
        text-decoration: none;
        transition: opacity 0.15s ease;
      }
      .hero-btn-primary:hover {
        opacity: 0.85;
      }
      .hero-btn-secondary {
        display: inline-flex;
        align-items: center;
        padding: 14px 28px;
        background: var(--color-surface-container);
        color: var(--color-on-surface-variant);
        font-weight: 600;
        font-size: 16px;
        border-radius: 12px;
        text-decoration: none;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .hero-btn-secondary:hover {
        background: var(--color-outline-variant);
        color: var(--color-on-surface);
      }

      .features {
        padding: 60px 24px;
      }
      .features-inner {
        max-width: 900px;
        margin: 0 auto;
        text-align: center;
      }
      .features-label {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: var(--color-on-surface-variant);
        margin-bottom: 12px;
      }
      .features-title {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: var(--color-on-surface);
        margin-bottom: 56px;
      }
      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 24px;
        text-align: left;
      }
      .feature-card {
        border: 1px solid var(--color-outline-variant);
        box-shadow: none;
      }
      .feature-card .border-glow-inner {
        padding: 28px;
      }
      .feature-card.border-glow-card::after {
        mix-blend-mode: screen;
      }
      .feature-card.border-glow-card > .edge-light {
        mix-blend-mode: screen;
      }
      .feature-icon {
        width: 44px;
        height: 44px;
        background: var(--color-primary-container);
        color: var(--color-primary);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
      }
      .feature-title {
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.2px;
        color: var(--color-on-surface);
        margin-bottom: 8px;
      }
      .feature-desc {
        font-size: 14px;
        line-height: 1.6;
        color: var(--color-on-surface-variant);
      }

      .cta-section {
        padding: 0 24px 100px;
      }
      .cta-card {
        max-width: 700px;
        margin: 0 auto;
        text-align: center;
        background: var(--color-primary-container);
        border: 1px solid var(--color-primary);
        border-radius: 20px;
        padding: 64px 40px;
      }
      .cta-title {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: var(--color-on-surface);
        margin-bottom: 12px;
      }
      .cta-subtitle {
        font-size: 17px;
        color: var(--color-on-surface-variant);
        margin-bottom: 32px;
      }
      .cta-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 32px;
        background: var(--color-primary);
        color: var(--color-on-primary);
        font-weight: 600;
        font-size: 16px;
        border-radius: 12px;
        text-decoration: none;
        transition: opacity 0.15s ease;
      }
      .cta-btn:hover {
        opacity: 0.85;
      }

      .landing-footer {
        border-top: 1px solid var(--color-outline-variant);
        padding: 24px;
      }
      .footer-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .footer-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 14px;
        color: var(--color-on-surface);
      }
      .footer-logo-img {
        height: 24px;
        width: auto;
      }
      .footer-copy {
        font-size: 13px;
        color: var(--color-on-surface-variant);
      }
      .carousel-section {
        padding: 40px 0 80px;
        text-align: center;
      }
      .carousel-label {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: var(--color-on-surface-variant);
        margin-bottom: 12px;
      }
      .carousel-title {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: var(--color-on-surface);
        margin-bottom: 48px;
        padding: 0 24px;
      }
      .carousel-viewport {
        position: relative;
        overflow: hidden;
        width: 100%;
      }
      .carousel-track {
        display: flex;
        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .carousel-slide {
        min-width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .carousel-slide-img-wrap {
        width: 100%;
        height: 520px;
        overflow: hidden;
      }
      .carousel-slide-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .carousel-slide-body {
        padding: 40px 24px;
        max-width: 600px;
      }
      .carousel-slide-title {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-on-surface);
        margin-bottom: 12px;
        letter-spacing: -0.3px;
      }
      .carousel-slide-desc {
        font-size: 16px;
        line-height: 1.7;
        color: var(--color-on-surface-variant);
      }
      .carousel-btn {
        position: absolute;
        top: 180px;
        transform: translateY(-50%);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid var(--color-outline-variant);
        background: var(--color-surface);
        color: var(--color-on-surface-variant);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
        z-index: 2;
      }
      .carousel-btn:hover {
        background: var(--color-surface-container);
        color: var(--color-on-surface);
      }
      .carousel-btn-left { left: 16px; }
      .carousel-btn-right { right: 16px; }
      .carousel-dots {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 24px;
      }
      .carousel-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: none;
        background: var(--color-outline-variant);
        cursor: pointer;
        transition: background 0.2s ease, transform 0.2s ease;
        padding: 0;
      }
      .carousel-dot.active {
        background: var(--color-primary);
        transform: scale(1.3);
      }
    `}</style>
  </div>
  );
};

export default Landing;
