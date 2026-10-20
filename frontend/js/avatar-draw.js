// Dibuja el avatar (cabello, rostro, ropa, accesorios) en un <canvas>.
// Lo usan tanto el editor (avatar.js) como el encabezado compartido (header.js).
window.AvatarDraw = (function () {
  function drawClothing(ctx, r, style, color) {
    ctx.fillStyle = color;
    const topY = r * 0.28, bottomY = r * 0.98;
    const topW = r * 0.32, botW = r * 0.9;
    ctx.beginPath();
    ctx.moveTo(-topW, topY);
    ctx.quadraticCurveTo(-botW * 1.05, topY + (bottomY - topY) * 0.35, -botW, bottomY);
    ctx.lineTo(botW, bottomY);
    ctx.quadraticCurveTo(botW * 1.05, topY + (bottomY - topY) * 0.35, topW, topY);
    ctx.closePath();
    ctx.fill();

    if (style === "shirt") {
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = Math.max(1.5, r * 0.03);
      ctx.beginPath();
      ctx.moveTo(-topW * 0.7, topY + 2);
      ctx.lineTo(0, topY + r * 0.22);
      ctx.lineTo(topW * 0.7, topY + 2);
      ctx.stroke();
    } else if (style === "blazer") {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.moveTo(-topW * 0.6, topY);
      ctx.lineTo(-botW * 0.25, bottomY);
      ctx.lineTo(-topW * 0.1, topY + r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(topW * 0.6, topY);
      ctx.lineTo(botW * 0.25, bottomY);
      ctx.lineTo(topW * 0.1, topY + r * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (style === "hoodie") {
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = Math.max(1.5, r * 0.025);
      ctx.beginPath();
      ctx.moveTo(-topW * 0.3, topY + 2); ctx.lineTo(-topW * 0.3, topY + r * 0.3);
      ctx.moveTo(topW * 0.3, topY + 2); ctx.lineTo(topW * 0.3, topY + r * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, topY, topW * 0.75, r * 0.12, 0, 0, Math.PI);
      ctx.stroke();
    }
  }

  function drawHair(ctx, r, cy, rx, ry, style, color) {
    if (style === "none") return;
    ctx.fillStyle = color;
    if (style === "short") {
      ctx.beginPath();
      ctx.ellipse(0, cy - ry * 0.55, rx * 1.02, ry * 0.62, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (style === "long") {
      ctx.beginPath();
      ctx.ellipse(0, cy - ry * 0.5, rx * 1.05, ry * 0.62, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-rx * 1.02, cy - ry * 0.1, rx * 0.3, ry * 1.6);
      ctx.fillRect(rx * 0.72, cy - ry * 0.1, rx * 0.3, ry * 1.6);
    } else if (style === "curly") {
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(i * rx * 0.32, cy - ry * 0.6, rx * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === "buzz") {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(0, cy - ry * 0.6, rx * 0.98, ry * 0.45, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (style === "ponytail") {
      ctx.beginPath();
      ctx.ellipse(0, cy - ry * 0.55, rx * 1.0, ry * 0.6, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(rx * 1.05, cy - ry * 0.05, rx * 0.22, ry * 0.55, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFace(ctx, r, cy, rx, ry, style) {
    const eyeY = cy - ry * 0.05;
    const eyeX = rx * 0.42;
    const eyeR = Math.max(1.6, r * 0.045);

    ctx.fillStyle = "rgba(20,15,10,0.85)";

    if (style === "surprised") {
      ctx.beginPath(); ctx.arc(-eyeX, eyeY, eyeR * 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeR * 1.3, 0, Math.PI * 2); ctx.fill();
    } else if (style === "serious") {
      ctx.beginPath(); ctx.arc(-eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(20,15,10,0.8)";
      ctx.lineWidth = Math.max(1.4, r * 0.035);
      ctx.beginPath(); ctx.moveTo(-eyeX - eyeR * 1.6, eyeY - eyeR * 2.2); ctx.lineTo(-eyeX + eyeR * 1.4, eyeY - eyeR * 1.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(eyeX + eyeR * 1.6, eyeY - eyeR * 2.2); ctx.lineTo(eyeX - eyeR * 1.4, eyeY - eyeR * 1.2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(-eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
    }

    ctx.strokeStyle = "rgba(20,15,10,0.75)";
    ctx.lineWidth = Math.max(1.4, r * 0.045);
    ctx.lineCap = "round";
    const mouthY = cy + ry * 0.42;
    ctx.beginPath();
    if (style === "happy") {
      ctx.arc(0, mouthY - ry * 0.12, rx * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
    } else if (style === "serious") {
      ctx.moveTo(-rx * 0.22, mouthY);
      ctx.lineTo(rx * 0.22, mouthY);
    } else if (style === "surprised") {
      ctx.arc(0, mouthY, rx * 0.14, 0, Math.PI * 2);
    } else {
      ctx.arc(0, mouthY - ry * 0.5, rx * 0.32, 0.35 * Math.PI, 0.65 * Math.PI);
    }
    ctx.stroke();
  }

  function drawAccessory(ctx, r, cy, rx, ry, style) {
    if (style === "glasses") {
      const eyeY = cy - ry * 0.05, eyeX = rx * 0.42, lensR = r * 0.16;
      ctx.strokeStyle = "#12142B";
      ctx.lineWidth = Math.max(1.6, r * 0.035);
      ctx.beginPath(); ctx.arc(-eyeX, eyeY, lensR, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(eyeX, eyeY, lensR, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-eyeX + lensR, eyeY); ctx.lineTo(eyeX - lensR, eyeY); ctx.stroke();
    } else if (style === "cap") {
      ctx.fillStyle = "#12142B";
      ctx.beginPath();
      ctx.ellipse(0, cy - ry * 0.62, rx * 1.05, ry * 0.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(rx * 0.35, cy - ry * 0.32, rx * 0.6, ry * 0.15, -0.15, 0, Math.PI);
      ctx.fill();
    } else if (style === "earrings") {
      ctx.fillStyle = "#C89B4A";
      ctx.beginPath(); ctx.arc(-rx * 0.98, cy + ry * 0.28, r * 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(rx * 0.98, cy + ry * 0.28, r * 0.03, 0, Math.PI * 2); ctx.fill();
    }
  }

  function draw(canvas, cfg) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height, r = w / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(r, r);

    const headCy = -r * 0.18, headRx = r * 0.44, headRy = r * 0.5;

    drawClothing(ctx, r, cfg.clothingStyle, cfg.clothingColor);

    ctx.fillStyle = cfg.skinTone;
    ctx.fillRect(-r * 0.12, headCy + headRy * 0.55, r * 0.24, r * 0.35);

    ctx.fillStyle = cfg.skinTone;
    ctx.beginPath();
    ctx.ellipse(-headRx * 0.98, headCy, r * 0.06, r * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headRx * 0.98, headCy, r * 0.06, r * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, headCy, headRx, headRy, 0, 0, Math.PI * 2);
    ctx.fill();

    drawHair(ctx, r, headCy, headRx, headRy, cfg.hairStyle, cfg.hairColor);
    drawFace(ctx, r, headCy, headRx, headRy, cfg.faceStyle);
    drawAccessory(ctx, r, headCy, headRx, headRy, cfg.accessoryStyle);

    ctx.restore();
  }

  return { draw };
})();
