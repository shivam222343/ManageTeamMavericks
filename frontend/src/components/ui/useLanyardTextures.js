import { useState, useEffect } from 'react';

/**
 * Returns time-specific greeting based on Indian Standard Time (IST)
 */
export const getISTGreeting = () => {
  const now = new Date();
  const istTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istTimeString);
  const hours = istDate.getHours();

  if (hours >= 4 && hours < 12) {
    return { text: 'Good Morning', icon: '🌅', period: 'Morning', timeStr: istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
  }
  if (hours >= 12 && hours < 17) {
    return { text: 'Good Afternoon', icon: '☀️', period: 'Afternoon', timeStr: istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
  }
  if (hours >= 17 && hours < 22) {
    return { text: 'Good Evening', icon: '🌆', period: 'Evening', timeStr: istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
  }
  return { text: 'Good Night', icon: '🌙', period: 'Night', timeStr: istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
};

/**
 * Hook that generates minimalist, high-res canvas textures for front, back and strap
 * matching the user's clean monochrome / portrait white card reference aesthetic.
 */
export const useLanyardTextures = (participantInfo, isDark = true) => {
  const [textures, setTextures] = useState({
    frontImage: null,
    backImage: null,
    strapImage: null,
    ready: false
  });

  useEffect(() => {
    let active = true;

    const generate = async () => {
      // 1. Load Team Mavericks Logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      const logoPromise = new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
        logoImg.src = '/Logos/Mavericks_Logo.png';
      });

      // 1b. Load User Custom Avatar Photo (if provided)
      let customAvatarImg = null;
      let avatarPromise = Promise.resolve();
      if (participantInfo?.avatar) {
        customAvatarImg = new Image();
        customAvatarImg.crossOrigin = 'anonymous';
        avatarPromise = new Promise((resolve) => {
          customAvatarImg.onload = resolve;
          customAvatarImg.onerror = resolve;
          customAvatarImg.src = participantInfo.avatar;
        });
      }

      await Promise.all([logoPromise, avatarPromise]);

      if (!active) return;

      const greeting = getISTGreeting();
      const name = (participantInfo?.name || 'Participant').toUpperCase();
      const email = participantInfo?.email || 'participant@teammavericks.org';
      const phone = participantInfo?.phone || '+91 ••••• •••••';

      // ==========================================================
      // --- THEME COLOR TOKENS ---
      // ==========================================================
      const cardGradientTop = isDark ? '#111827' : '#FFFFFF';
      const cardGradientBottom = isDark ? '#070B14' : '#F8FAFC';
      const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
      const textSecondary = isDark ? '#E2E8F0' : '#475569';
      const textMuted = isDark ? '#94A3B8' : '#64748B';
      const accentBlue = isDark ? '#38BDF8' : '#2563EB';
      const borderLine = isDark ? 'rgba(56, 189, 248, 0.22)' : '#E2E8F0';

      // ==========================================================
      // --- 1. FRONT CANVAS (1024 x 1440) ---
      // ==========================================================
      const frontCanvas = document.createElement('canvas');
      frontCanvas.width = 1024;
      frontCanvas.height = 1440;
      const fCtx = frontCanvas.getContext('2d');

      if (fCtx) {
        // Theme-responsive background gradient
        const bgGrad = fCtx.createLinearGradient(0, 0, 1024, 1440);
        bgGrad.addColorStop(0, cardGradientTop);
        bgGrad.addColorStop(1, cardGradientBottom);
        fCtx.fillStyle = bgGrad;
        fCtx.fillRect(0, 0, 1024, 1440);

        // Subtle decorative outer border
        fCtx.strokeStyle = borderLine;
        fCtx.lineWidth = 4;
        fCtx.strokeRect(8, 8, 1008, 1424);

        // Subtle top watermark logo on the top-left
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          fCtx.save();
          fCtx.globalAlpha = isDark ? 0.14 : 0.08;
          fCtx.drawImage(logoImg, 60, 60, 160, 160);
          fCtx.restore();
        }

        // Top right clean handle / brand
        fCtx.fillStyle = textMuted;
        fCtx.font = '600 24px monospace';
        fCtx.textAlign = 'right';
        fCtx.fillText('@teammavericks', 940, 100);

        // Center / Portrait Artwork (custom uploaded image OR clean sketched avatar)
        fCtx.save();
        const cx = 512;
        const cy = 520;

        if (customAvatarImg && customAvatarImg.complete && customAvatarImg.naturalWidth > 0) {
          // --- USER UPLOADED PHOTO ---
          const radius = 220;

          // Soft vignette / glow under portrait
          const pGlow = fCtx.createRadialGradient(cx, cy, 80, cx, cy, 320);
          if (isDark) {
            pGlow.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
            pGlow.addColorStop(1, 'rgba(10, 15, 29, 0)');
          } else {
            pGlow.addColorStop(0, 'rgba(241, 245, 249, 1)');
            pGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
          }
          fCtx.fillStyle = pGlow;
          fCtx.fillRect(100, 200, 824, 600);

          // Circular clip for avatar
          fCtx.save();
          fCtx.beginPath();
          fCtx.arc(cx, cy, radius, 0, Math.PI * 2);
          fCtx.closePath();
          fCtx.clip();

          // Aspect-ratio cover calculation
          const scale = Math.max((radius * 2) / customAvatarImg.naturalWidth, (radius * 2) / customAvatarImg.naturalHeight);
          const dw = customAvatarImg.naturalWidth * scale;
          const dh = customAvatarImg.naturalHeight * scale;
          fCtx.drawImage(customAvatarImg, cx - dw / 2, cy - dh / 2, dw, dh);
          fCtx.restore();

          // Clean borders around photo
          fCtx.beginPath();
          fCtx.arc(cx, cy, radius, 0, Math.PI * 2);
          fCtx.strokeStyle = accentBlue;
          fCtx.lineWidth = 10;
          fCtx.stroke();

          fCtx.beginPath();
          fCtx.arc(cx, cy, radius + 12, 0, Math.PI * 2);
          fCtx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(37, 99, 235, 0.18)';
          fCtx.lineWidth = 6;
          fCtx.stroke();
        } else {
          // --- DEFAULT SKETCHED PERSON SILHOUETTE ICON ---
          const pGlow = fCtx.createRadialGradient(512, 500, 40, 512, 500, 320);
          if (isDark) {
            pGlow.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
            pGlow.addColorStop(0.5, 'rgba(30, 41, 59, 0.45)');
            pGlow.addColorStop(1, 'rgba(10, 15, 29, 0)');
          } else {
            pGlow.addColorStop(0, 'rgba(241, 245, 249, 1)');
            pGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
          }
          fCtx.fillStyle = pGlow;
          fCtx.fillRect(100, 200, 824, 600);

          // Head / Hair Silhouette
          fCtx.fillStyle = isDark ? '#334155' : '#0F172A';
          fCtx.beginPath();
          // Hair top
          fCtx.arc(cx, cy - 80, 110, Math.PI * 0.9, Math.PI * 2.1);
          // Face outline
          fCtx.quadraticCurveTo(cx + 120, cy + 40, cx + 80, cy + 100);
          fCtx.quadraticCurveTo(cx, cy + 160, cx - 80, cy + 100);
          fCtx.quadraticCurveTo(cx - 120, cy + 40, cx - 110, cy - 80);
          fCtx.fill();

          // Face skin area
          fCtx.fillStyle = isDark ? '#F1F5F9' : '#F8FAFC';
          fCtx.beginPath();
          fCtx.ellipse(cx, cy + 10, 75, 95, 0, 0, Math.PI * 2);
          fCtx.fill();

          // Hair styling (front bangs)
          fCtx.fillStyle = isDark ? '#334155' : '#0F172A';
          fCtx.beginPath();
          fCtx.moveTo(cx - 85, cy - 60);
          fCtx.quadraticCurveTo(cx - 30, cy - 90, cx, cy - 65);
          fCtx.quadraticCurveTo(cx + 40, cy - 100, cx + 85, cy - 60);
          fCtx.quadraticCurveTo(cx + 40, cy - 40, cx, cy - 45);
          fCtx.quadraticCurveTo(cx - 40, cy - 40, cx - 85, cy - 60);
          fCtx.fill();

          // Beard / Jaw shadow
          fCtx.fillStyle = isDark ? '#475569' : '#1E293B';
          fCtx.beginPath();
          fCtx.arc(cx, cy + 50, 60, Math.PI * 0.15, Math.PI * 0.85);
          fCtx.quadraticCurveTo(cx, cy + 115, cx + 55, cy + 65);
          fCtx.fill();

          // Shoulders / Dark T-shirt (sketched style)
          fCtx.fillStyle = isDark ? '#1E293B' : '#0F172A';
          fCtx.beginPath();
          fCtx.moveTo(cx - 240, 840);
          fCtx.quadraticCurveTo(cx - 160, cy + 150, cx - 85, cy + 140);
          fCtx.quadraticCurveTo(cx, cy + 175, cx + 85, cy + 140);
          fCtx.quadraticCurveTo(cx + 160, cy + 150, cx + 240, 840);
          fCtx.lineTo(cx - 240, 840);
          fCtx.fill();

          // T-Shirt Collar Line
          fCtx.strokeStyle = isDark ? '#38BDF8' : '#334155';
          fCtx.lineWidth = 4;
          fCtx.beginPath();
          fCtx.arc(cx, cy + 145, 60, Math.PI * 0.1, Math.PI * 0.9);
          fCtx.stroke();
        }
        fCtx.restore();

        // ==========================================================
        // --- FRONT TEXT: GREETING, NAME, EMAIL, CONTACT ONLY ---
        // ==========================================================
        fCtx.textAlign = 'center';

        // 1. Time-Specific Greeting (IST)
        fCtx.fillStyle = accentBlue;
        fCtx.font = 'bold 30px sans-serif';
        fCtx.fillText(`${greeting.icon} ${greeting.text}!`, 512, 915);

        // 2. Participant Full Name
        fCtx.fillStyle = textPrimary;
        fCtx.font = '900 52px sans-serif';
        fCtx.fillText(name, 512, 985);

        // Thin decorative line
        fCtx.strokeStyle = borderLine;
        fCtx.lineWidth = 2;
        fCtx.beginPath();
        fCtx.moveTo(340, 1030);
        fCtx.lineTo(684, 1030);
        fCtx.stroke();

        // 3. Email
        fCtx.fillStyle = textSecondary;
        fCtx.font = '600 28px sans-serif';
        fCtx.fillText(email, 512, 1085);

        // 4. Contact Number
        fCtx.fillStyle = textMuted;
        fCtx.font = '600 28px sans-serif';
        fCtx.fillText(phone, 512, 1145);
      }

      // ==========================================================
      // --- 2. BACK CANVAS (1024 x 1440) - Logo & teammavericks.kit only
      // ==========================================================
      const backCanvas = document.createElement('canvas');
      backCanvas.width = 1024;
      backCanvas.height = 1440;
      const bCtx = backCanvas.getContext('2d');

      if (bCtx) {
        // Theme-responsive background gradient
        const bGrad = bCtx.createLinearGradient(0, 0, 1024, 1440);
        bGrad.addColorStop(0, cardGradientTop);
        bGrad.addColorStop(1, cardGradientBottom);
        bCtx.fillStyle = bGrad;
        bCtx.fillRect(0, 0, 1024, 1440);

        // Subtle decorative outer border
        bCtx.strokeStyle = borderLine;
        bCtx.lineWidth = 4;
        bCtx.strokeRect(8, 8, 1008, 1424);

        // Center Team Mavericks Logo
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          bCtx.drawImage(logoImg, 352, 450, 320, 320);
        }

        // Below Logo: "TEAM MAVERICKS" and "teammavericks.kit" ONLY
        bCtx.fillStyle = textPrimary;
        bCtx.font = '900 58px sans-serif';
        bCtx.textAlign = 'center';
        bCtx.fillText('TEAM MAVERICKS', 512, 850);

        bCtx.fillStyle = accentBlue;
        bCtx.font = '800 42px monospace';
        bCtx.fillText('teammavericks.kit', 512, 920);
      }

      // ==========================================================
      // --- 3. STRAP CANVAS (256 x 1024) - Black Strap with Centered Logo Icon
      // ==========================================================
      const strapCanvas = document.createElement('canvas');
      strapCanvas.width = 256;
      strapCanvas.height = 1024;
      const sCtx = strapCanvas.getContext('2d');

      if (sCtx) {
        // Clean deep black strap matching reference
        sCtx.fillStyle = '#111111';
        sCtx.fillRect(0, 0, 256, 1024);

        // Draw crisp centered white Team Mavericks logo icons repeating vertically along the strap
        // Rotated -Math.PI / 2 (180deg opposite to previous +Math.PI / 2) so logos are right-side up
        sCtx.save();
        sCtx.translate(128, 1024);
        sCtx.rotate(-Math.PI / 2);

        // Spacing for repeating logo on strap
        for (let x = -100; x < 1200; x += 360) {
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            // Draw clean logo in center of strap
            sCtx.drawImage(logoImg, x, -60, 120, 120);
          }
        }
        sCtx.restore();
      }

      if (active) {
        setTextures({
          frontImage: frontCanvas.toDataURL('image/png'),
          backImage: backCanvas.toDataURL('image/png'),
          strapImage: strapCanvas.toDataURL('image/png'),
          ready: true
        });
      }
    };

    generate();

    return () => {
      active = false;
    };
  }, [participantInfo, isDark]);

  return textures;
};
