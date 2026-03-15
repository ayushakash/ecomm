import React, { useState, useRef, useEffect } from 'react';
import SEO from '../components/SEO/SEO';
import analytics from '../services/analytics';
import api, { merchantAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { formatPrice } from '../utils/pricingUtils';

const Calculator = () => {
  const canvasRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    length: '',
    breadth: '',
    area: '',
    floors: 1,
    includeFooting: false,
    priceCement: 350,
    priceSteel: 72,
    priceSand: 40,
    priceAgg: 70,
    priceBricks: 10000
  });

  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // City & Pricing state
  const [selectedCity, setSelectedCity] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [pricingMode, setPricingMode] = useState('market'); // 'market' or 'custom'
  const [cityPrices, setCityPrices] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Lead capture modal
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', phone: '' });

  // Calculation defaults (Based on Indian construction thumb rules)
  const DEFAULTS = {
    columnSpacing: 10, // Default column spacing in feet
    cementBagsPerSqft: 0.45,        // Civil engineering thumb rule: 0.40–0.45 bags/sqft
    steelKgPerSqft: 3.3,            // Civil engineering thumb rule: 3.0–3.5 kg/sqft
    sandCuftPerSqft: 1.1,           // Civil engineering thumb rule: 1.0–1.2 cuft/sqft
    aggCuftPerSqft: 1.6,            // Civil engineering thumb rule: 1.5–1.7 cuft/sqft
    bricksPerSqft: 7.5,             // Civil engineering thumb rule: 7–8 bricks/sqft (4" wall)
    footingPerColumn: {
      cementBags: 4,                // Standard for 3'x3'x3' footing
      steelKg: 50,                  // Conservative estimate for column reinforcement
      sandCuft: 7.5,                // Industry standard: 7-8 cuft per column
      aggCuft: 14.5                 // Industry standard: 14-15 cuft per column
    }
  };

  const q = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // Social Media Configuration from Footer.jsx
  const SOCIAL_MEDIA_LINKS = {
    facebook: 'https://www.facebook.com/ChardeevariConstruction',
    instagram: 'https://www.instagram.com/chardeevari.in/',
    linkedin: 'https://www.linkedin.com/company/chardeevari/',
    twitter: 'https://x.com/Chardeevari_in',
    email: 'chardeevari.construction@gmail.com'
  };

  // Fetch available cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await merchantAPI.getAvailableCities();
        if (response.cities && response.cities.length > 0) {
          setAvailableCities(response.cities);
          // Set first city as default if no city selected
          if (!selectedCity) {
            setSelectedCity(response.cities[0].city);
          }
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };
    fetchCities();
  }, []);

  // Fetch city prices when city or pricing mode changes
  useEffect(() => {
    const fetchCityPrices = async () => {
      if (pricingMode !== 'market' || !selectedCity) return;

      setLoadingPrices(true);
      try {
        const response = await api.get(`/api/analytics/city-prices/${selectedCity}`);
        if (response.data.success && response.data.prices) {
          setCityPrices(response.data);
          const p = response.data.prices;
          setFormData(prev => ({
            ...prev,
            priceCement: p.cement?.avg || 350,
            priceSteel:  p.steel?.avg  || 72,
            priceSand:   p.sand?.avg   || 40,
            priceAgg:    p.aggregate?.avg || 70,
            priceBricks: p.bricks?.avg || 10000
          }));
          // Inform user if falling back to defaults for some materials
          const fallbackMaterials = Object.entries(p)
            .filter(([, v]) => !v.isLive)
            .map(([k]) => k);
          if (fallbackMaterials.length === Object.keys(p).length) {
            toast('No live prices found for ' + selectedCity + ' — using standard rates', { icon: 'ℹ️' });
          } else if (fallbackMaterials.length > 0) {
            toast('Some prices use standard rates (no local data): ' + fallbackMaterials.join(', '), { icon: 'ℹ️' });
          }
        }
      } catch (error) {
        console.error('Error fetching city prices:', error);
        // Silently fall back — no toast error, custom prices still available
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchCityPrices();
  }, [selectedCity, pricingMode]);

  // Draw grid when results are updated
  useEffect(() => {
    if (results && results.gridParams) {
      const { length, breadth, colsX, colsY, spacing, assumedSquare } = results.gridParams;
      // Use setTimeout to ensure canvas is rendered in DOM
      setTimeout(() => {
        drawGrid(length, breadth, colsX, colsY, spacing, assumedSquare);
      }, 50);
    }
  }, [results]);

  const calculateMaterials = () => {
    setIsCalculating(true);
    const { length: L, breadth: B, area, floors, includeFooting, priceCement, priceSteel, priceSand, priceAgg, priceBricks } = formData;
    const areaNum = parseFloat(area) || 0;
    const floorsNum = parseInt(floors) || 1;
    const spacingNum = DEFAULTS.columnSpacing; // Use default column spacing

    // Determine length and breadth
    let length = parseFloat(L) || 0;
    let breadth = parseFloat(B) || 0;
    let assumedSquare = false;

    // If length and breadth not provided, use area and assume square
    if ((!length || !breadth) && areaNum) {
      length = breadth = Math.sqrt(areaNum);
      assumedSquare = true;
    } else if (!length || !breadth) {
      alert('Please enter either Length & Breadth OR Area.');
      setIsCalculating(false);
      return;
    }

    const builtArea = length * breadth;

    // Calculate columns
    const colsX = Math.ceil(length / spacingNum) + 1;
    const colsY = Math.ceil(breadth / spacingNum) + 1;
    const totalColumns = colsX * colsY;

    // Base calculations per floor
    const cementPerFloor = builtArea * DEFAULTS.cementBagsPerSqft;
    const steelPerFloor = builtArea * DEFAULTS.steelKgPerSqft;
    const sandPerFloor = builtArea * DEFAULTS.sandCuftPerSqft;
    const aggPerFloor = builtArea * DEFAULTS.aggCuftPerSqft;
    const bricksPerFloor = builtArea * DEFAULTS.bricksPerSqft;

    // Total for all floors
    let totalCement = cementPerFloor * floorsNum;
    let totalSteel = steelPerFloor * floorsNum;
    let totalSand = sandPerFloor * floorsNum;
    let totalAgg = aggPerFloor * floorsNum;
    let totalBricks = bricksPerFloor * floorsNum;

    // Calculate foundation materials separately
    let foundationCement = 0, foundationSteel = 0, foundationSand = 0, foundationAgg = 0;
    if (includeFooting) {
      foundationCement = totalColumns * DEFAULTS.footingPerColumn.cementBags;
      foundationSteel = totalColumns * DEFAULTS.footingPerColumn.steelKg;
      foundationSand = totalColumns * DEFAULTS.footingPerColumn.sandCuft;
      foundationAgg = totalColumns * DEFAULTS.footingPerColumn.aggCuft;
      
      // Add to totals
      totalCement += foundationCement;
      totalSteel += foundationSteel;
      totalSand += foundationSand;
      totalAgg += foundationAgg;
    }

    // Calculate total costs
    const cementCost = totalCement * priceCement;
    const steelCost = totalSteel * priceSteel;
    const sandCost = totalSand * priceSand;
    const aggCost = totalAgg * priceAgg;
    const bricksCost = (totalBricks / 1000) * priceBricks;
    const totalCost = cementCost + steelCost + sandCost + aggCost + bricksCost;

    // Structure materials (excluding foundation)
    const structureCement = cementPerFloor * floorsNum;
    const structureSteel = steelPerFloor * floorsNum;
    const structureSand = sandPerFloor * floorsNum;
    const structureAgg = aggPerFloor * floorsNum;
    const structureBricks = bricksPerFloor * floorsNum;

    // Foundation costs
    const foundationCementCost = foundationCement * priceCement;
    const foundationSteelCost = foundationSteel * priceSteel;
    const foundationSandCost = foundationSand * priceSand;
    const foundationAggCost = foundationAgg * priceAgg;
    const foundationTotalCost = foundationCementCost + foundationSteelCost + foundationSandCost + foundationAggCost;

    // Structure costs
    const structureCementCost = structureCement * priceCement;
    const structureSteelCost = structureSteel * priceSteel;
    const structureSandCost = structureSand * priceSand;
    const structureAggCost = structureAgg * priceAgg;
    const structureBricksCost = (structureBricks / 1000) * priceBricks;
    const structureTotalCost = structureCementCost + structureSteelCost + structureSandCost + structureAggCost + structureBricksCost;

    const calculationResults = {
      length: q(length),
      breadth: q(breadth),
      area: q(builtArea),
      floors: floorsNum,
      columns: totalColumns,
      colsX,
      colsY,
      spacing: spacingNum,
      assumedSquare,
      cement: { quantity: q(totalCement), unit: 'bags', cost: q(cementCost), pricePerUnit: q(priceCement) },
      steel: { quantity: q(totalSteel), unit: 'kg', cost: q(steelCost), pricePerUnit: q(priceSteel) },
      sand: { quantity: q(totalSand), unit: 'cu.ft', cost: q(sandCost), pricePerUnit: q(priceSand) },
      aggregate: { quantity: q(totalAgg), unit: 'cu.ft', cost: q(aggCost), pricePerUnit: q(priceAgg) },
      bricks: { quantity: q(totalBricks), unit: 'nos', cost: q(bricksCost), pricePerUnit: q(priceBricks/1000) },
      totalCost: q(totalCost),
      // Foundation materials
      foundationMaterials: includeFooting ? {
        cement: { quantity: q(foundationCement), unit: 'bags', cost: q(foundationCementCost), pricePerUnit: q(priceCement) },
        steel: { quantity: q(foundationSteel), unit: 'kg', cost: q(foundationSteelCost), pricePerUnit: q(priceSteel) },
        sand: { quantity: q(foundationSand), unit: 'cu.ft', cost: q(foundationSandCost), pricePerUnit: q(priceSand) },
        aggregate: { quantity: q(foundationAgg), unit: 'cu.ft', cost: q(foundationAggCost), pricePerUnit: q(priceAgg) },
        totalCost: q(foundationTotalCost)
      } : null,
      // Structure materials (excluding foundation)
      structureMaterials: {
        cement: { quantity: q(structureCement), unit: 'bags', cost: q(structureCementCost), pricePerUnit: q(priceCement) },
        steel: { quantity: q(structureSteel), unit: 'kg', cost: q(structureSteelCost), pricePerUnit: q(priceSteel) },
        sand: { quantity: q(structureSand), unit: 'cu.ft', cost: q(structureSandCost), pricePerUnit: q(priceSand) },
        aggregate: { quantity: q(structureAgg), unit: 'cu.ft', cost: q(structureAggCost), pricePerUnit: q(priceAgg) },
        bricks: { quantity: q(structureBricks), unit: 'nos', cost: q(structureBricksCost), pricePerUnit: q(priceBricks/1000) },
        totalCost: q(structureTotalCost)
      },
      // Grid drawing parameters
      gridParams: {
        length,
        breadth,
        colsX,
        colsY,
        spacing: spacingNum,
        assumedSquare
      }
    };

    setResults(calculationResults);

    // Track calculator usage in analytics
    analytics.trackCalculatorUse({
      area: builtArea,
      floors: floorsNum,
      totalCost: q(totalCost),
      materials: {
        cement: q(totalCement),
        steel: q(totalSteel),
        sand: q(totalSand),
        aggregate: q(totalAgg),
        bricks: q(totalBricks)
      }
    });

    setIsCalculating(false);
  };

  const drawGrid = (length, breadth, colsX, colsY, spacing, assumedSquare) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const isMobile = window.innerWidth <= 640;

    canvas.width = isMobile ? Math.min(350, window.innerWidth - 40) : 760;
    canvas.height = isMobile ? Math.min(canvas.width * 0.7, 280) : Math.min(canvas.width * 0.6, 460);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pad = isMobile ? 30 : 50;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;

    const scale = Math.min(w / length, h / breadth);
    const drawW = length * scale;
    const drawH = breadth * scale;
    const originX = pad + (w - drawW) / 2;
    const originY = pad + (h - drawH) / 2;

    // Draw outer rectangle
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = isMobile ? 1.5 : 2;
    ctx.strokeRect(originX, originY, drawW, drawH);

    const dx = drawW / (colsX - 1);
    const dy = drawH / (colsY - 1);

    // Draw grid lines
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = isMobile ? 1 : 2;
    for (let i = 0; i < colsY; i++) {
      ctx.beginPath();
      ctx.moveTo(originX, originY + i * dy);
      ctx.lineTo(originX + drawW, originY + i * dy);
      ctx.stroke();
    }
    for (let j = 0; j < colsX; j++) {
      ctx.beginPath();
      ctx.moveTo(originX + j * dx, originY);
      ctx.lineTo(originX + j * dx, originY + drawH);
      ctx.stroke();
    }

    // Draw columns
    ctx.fillStyle = '#b91c1c';
    const circleRadius = isMobile ? 3 : 5;
    for (let i = 0; i < colsY; i++) {
      for (let j = 0; j < colsX; j++) {
        const cx = originX + j * dx;
        const cy = originY + i * dy;
        ctx.beginPath();
        ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dimension lines
    ctx.strokeStyle = '#059669';
    ctx.fillStyle = '#059669';
    ctx.lineWidth = 1;
    const dimOffset = isMobile ? 15 : 20;
    const fontSize = isMobile ? 9 : 11;
    ctx.font = `bold ${fontSize}px Arial`;

    // Top dimension (length)
    const topDimY = originY - dimOffset;
    ctx.beginPath();
    ctx.moveTo(originX, topDimY);
    ctx.lineTo(originX + drawW, topDimY);
    ctx.stroke();

    const lengthText = `${q(length)} ft`;
    const lengthTextWidth = ctx.measureText(lengthText).width;
    ctx.fillText(lengthText, originX + (drawW - lengthTextWidth) / 2, topDimY - 5);

    // Right dimension (breadth)
    const rightDimX = originX + drawW + dimOffset;
    ctx.beginPath();
    ctx.moveTo(rightDimX, originY);
    ctx.lineTo(rightDimX, originY + drawH);
    ctx.stroke();

    const breadthText = `${q(breadth)} ft`;
    ctx.save();
    ctx.translate(rightDimX + (isMobile ? 8 : 10), originY + drawH / 2);
    ctx.rotate(-Math.PI / 2);
    const breadthTextWidth = ctx.measureText(breadthText).width;
    ctx.fillText(breadthText, -breadthTextWidth / 2, 0);
    ctx.restore();

    // Grid info
    ctx.fillStyle = '#111827';
    ctx.font = `${isMobile ? 9 : 10}px Arial`;
    const gridText = `Grid: ${colsX} × ${colsY} (spacing ${q(spacing)} ft)`;
    ctx.fillText(gridText, originX, originY + drawH + (isMobile ? 15 : 20));
    if (assumedSquare) {
      ctx.fillText('(Square footprint assumed)', originX, originY + drawH + (isMobile ? 25 : 32));
    }
  };

  // Download PDF with lead capture
  const handleDownloadPDF = () => {
    if (!results) {
      toast.error('Please calculate materials first');
      return;
    }
    setShowLeadModal(true);
  };

  const generatePDF = () => {
    if (!leadData.name || !leadData.phone) {
      toast.error('Please enter your name and phone number');
      return;
    }

    if (leadData.phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 10;

    // ========== MODERN HEADER LAYOUT (Option 3) ==========
    const headerHeight = 45;

    // Top section - Dark slate background
    doc.setFillColor(30, 41, 59); // Sophisticated dark slate
    doc.rect(0, 0, pageWidth, 32, 'F');

    // Bottom section - Light gray background (thinner)
    doc.setFillColor(248, 250, 252); // Very light gray
    doc.rect(0, 32, pageWidth, 13, 'F');

    // Add logo
    try {
      const logoUrl = '/logo.webp';
      const logoImg = new Image();
      logoImg.src = logoUrl;
      // Logo in top-left (width: 23px, height: 20px)
      doc.addImage(logoUrl, 'PNG', 10, 6, 23, 20);
    } catch (error) {
      // Logo placeholder if not found
      doc.setFillColor(255, 255, 255);
      doc.circle(20, 16, 10, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('C', 20, 18, { align: 'center' });
    }

    // Company name and subtitle (top section)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CHARDEEVARI', 35, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Construction Material Estimate', 35, 24);

    // Contact info section (bottom light gray area - thinner)
    doc.setTextColor(51, 65, 85); // Dark gray text

    // Email and Phone (left side, stacked)
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    const emailX = 15;
    const emailY = 38;

    // Email
    const emailText = `Email: ${SOCIAL_MEDIA_LINKS.email}`;
    doc.text(emailText, emailX, emailY);
    const emailWidth = doc.getTextWidth(emailText);
    doc.link(emailX, emailY - 3, emailWidth, 4, { url: `mailto:${SOCIAL_MEDIA_LINKS.email}` });

    // Phone (below email)
    const phoneText = `Phone: +91 6201176610`;
    doc.text(phoneText, emailX, emailY + 5);
    const phoneWidth = doc.getTextWidth(phoneText);
    doc.link(emailX, emailY + 2, phoneWidth, 4, { url: 'tel:+916201176610' });

    // Social Media Icons (right side, properly centered)
    const iconY = 38.5;
    const iconSize = 5;
    const iconSpacing = 15;
    const totalIconWidth = (4 * iconSpacing);
    const iconsStartX = pageWidth - totalIconWidth - 10; // Right-aligned with padding

    // Helper function to draw social media icon
    const drawSocialIcon = (x, color, letter, url) => {
      // Draw colored circle
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(x, iconY, iconSize / 2, 'F');

      // White letter in center
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(letter, x, iconY + 1, { align: 'center' });

      // Add clickable link area
      doc.link(x - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize, { url: url });
    };

    // Draw social media icons with proper brand colors
    drawSocialIcon(iconsStartX, [59, 89, 152], 'f', SOCIAL_MEDIA_LINKS.facebook); // Facebook blue
    drawSocialIcon(iconsStartX + iconSpacing, [225, 48, 108], 'i', SOCIAL_MEDIA_LINKS.instagram); // Instagram pink
    drawSocialIcon(iconsStartX + iconSpacing * 2, [0, 119, 181], 'in', SOCIAL_MEDIA_LINKS.linkedin); // LinkedIn blue
    drawSocialIcon(iconsStartX + iconSpacing * 3, [29, 161, 242], 'X', SOCIAL_MEDIA_LINKS.twitter); // Twitter blue

    // Separator line
    doc.setDrawColor(203, 213, 225); // Light gray line
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    yPos = headerHeight + 10;

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Customer Details Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Details', 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${leadData.name}`, 15, yPos);
    yPos += 6;
    doc.text(`Phone: ${leadData.phone}`, 15, yPos);
    yPos += 6;
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 15, yPos);
    yPos += 10;

    // Project Details Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Details', 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Location: ${selectedCity}`, 15, yPos);
    yPos += 6;
    doc.text(`Dimensions: ${results.length} ft × ${results.breadth} ft`, 15, yPos);
    yPos += 6;
    doc.text(`Built-up Area: ${results.area} sq.ft`, 15, yPos);
    yPos += 6;
    doc.text(`Number of Floors: ${results.floors}`, 15, yPos);
    yPos += 6;
    doc.text(`Columns Required: ${results.columns} (${results.colsX} × ${results.colsY} grid)`, 15, yPos);
    yPos += 10;

    // Material Requirements Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Material Requirements & Cost', 15, yPos);
    yPos += 8;

    // Helper function to add material with brands and unit price
    const addMaterial = (name, quantity, unit, cost, unitPrice, materialKey) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(name, 15, yPos);

      doc.setFont('helvetica', 'normal');
      doc.text(`${quantity} ${unit}`, 80, yPos);
      doc.text(`Rs ${unitPrice}/${unit.split(' ')[0]}`, 125, yPos);
      doc.text(`Rs ${cost}`, 185, yPos, { align: 'right' });
      yPos += 5;

      // Add brands if available
      if (pricingMode === 'market' && cityPrices && cityPrices.prices[materialKey]?.brands && cityPrices.prices[materialKey].brands.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const brands = cityPrices.prices[materialKey].brands.join(', ');
        const brandText = `(${brands})`;
        const splitBrands = doc.splitTextToSize(brandText, 170);
        doc.text(splitBrands, 20, yPos);
        yPos += splitBrands.length * 3 + 2;
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('(using standard pricing)', 20, yPos);
        yPos += 5;
        doc.setTextColor(0, 0, 0);
      }
      yPos += 2;
    };

    // Structure Materials Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('STRUCTURE MATERIALS', 15, yPos);
    yPos += 8;

    // Add structure materials
    addMaterial('Cement', results.structureMaterials.cement.quantity, 'bags (50kg)', results.structureMaterials.cement.cost, results.structureMaterials.cement.pricePerUnit, 'cement');
    addMaterial('Steel (TMT Bars)', results.structureMaterials.steel.quantity, 'kg', results.structureMaterials.steel.cost, results.structureMaterials.steel.pricePerUnit, 'steel');
    addMaterial('Sand (M-Sand)', results.structureMaterials.sand.quantity, 'cu.ft', results.structureMaterials.sand.cost, results.structureMaterials.sand.pricePerUnit, 'sand');
    addMaterial('Aggregate (20mm)', results.structureMaterials.aggregate.quantity, 'cu.ft', results.structureMaterials.aggregate.cost, results.structureMaterials.aggregate.pricePerUnit, 'aggregate');
    addMaterial('Bricks', results.structureMaterials.bricks.quantity, 'nos', results.structureMaterials.bricks.cost, results.structureMaterials.bricks.pricePerUnit, 'bricks');

    // Structure subtotal
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Structure Subtotal:', 125, yPos);
    doc.text(`Rs ${results.structureMaterials.totalCost}`, 185, yPos, { align: 'right' });
    yPos += 8;

    // Foundation Materials Section
    if (results.foundationMaterials) {
      yPos += 3;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('FOUNDATION MATERIALS', 15, yPos);
      yPos += 8;

      // Add foundation materials
      addMaterial('Cement', results.foundationMaterials.cement.quantity, 'bags (50kg)', results.foundationMaterials.cement.cost, results.foundationMaterials.cement.pricePerUnit, 'cement');
      addMaterial('Steel', results.foundationMaterials.steel.quantity, 'kg', results.foundationMaterials.steel.cost, results.foundationMaterials.steel.pricePerUnit, 'steel');
      addMaterial('Sand', results.foundationMaterials.sand.quantity, 'cu.ft', results.foundationMaterials.sand.cost, results.foundationMaterials.sand.pricePerUnit, 'sand');
      addMaterial('Aggregate', results.foundationMaterials.aggregate.quantity, 'cu.ft', results.foundationMaterials.aggregate.cost, results.foundationMaterials.aggregate.pricePerUnit, 'aggregate');

      // Foundation subtotal
      yPos += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Foundation Subtotal:', 125, yPos);
      doc.text(`Rs ${results.foundationMaterials.totalCost}`, 185, yPos, { align: 'right' });
      yPos += 8;
    }

    // Total Cost
    yPos += 5;
    doc.setDrawColor(0, 0, 0);
    doc.line(15, yPos, 195, yPos);
    yPos += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ESTIMATED COST', 15, yPos);
    doc.setTextColor(34, 139, 34);
    doc.text(`Rs ${results.totalCost}`, 185, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    // Pricing Info (disclaimers at bottom)
    yPos += 8;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139); // Gray text
    if (pricingMode === 'market' && cityPrices) {
      doc.text(`* Prices based on ${cityPrices.merchantCount} verified merchants in ${selectedCity}`, 15, yPos);
    } else {
      doc.text('* Prices are standard estimates and may vary based on market conditions', 15, yPos);
    }
    yPos += 4;
    doc.text('* Actual requirements may vary based on design, wastage, and site conditions', 15, yPos);
    yPos += 4;
    doc.text('* This is a preliminary estimate. Final quantities should be verified by a civil engineer.', 15, yPos);

    // Save PDF (always single page)
    doc.save(`Chardeevari_Estimate_${leadData.name.replace(/\s/g, '_')}.pdf`);

    toast.success('PDF Report downloaded successfully!');
    setShowLeadModal(false);
    setLeadData({ name: '', phone: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Construction Material Calculator - Cement, Steel, Sand, Bricks | Ranchi"
        description="Free construction material calculator for Ranchi. Estimate cement, steel, sand, aggregate, and brick requirements for your building project in Jharkhand."
        keywords="construction calculator Ranchi, cement calculator, building material estimate, construction cost calculator Jharkhand, steel calculator, sand calculator, brick calculator"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Construction Material Calculator
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Estimate cement, steel, sand & bricks for your project</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* City selector — always accessible */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5">
              <span className="text-sm">📍</span>
              {availableCities.length === 0 ? (
                <span className="text-sm text-gray-400">Detecting city...</span>
              ) : (
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer max-w-[120px]"
                >
                  {availableCities.map((city) => (
                    <option key={city.city} value={city.city}>{city.city}</option>
                  ))}
                </select>
              )}
              {loadingPrices
                ? <span className="text-xs text-primary-600 animate-spin inline-block">↻</span>
                : cityPrices && pricingMode === 'market' && (
                  <span className={`text-xs font-semibold ${
                    Object.values(cityPrices.prices || {}).some(v => v.isLive)
                      ? 'text-green-600' : 'text-amber-500'
                  }`}>
                    {Object.values(cityPrices.prices || {}).some(v => v.isLive) ? '● live' : '○ est'}
                  </span>
                )
              }
            </div>
            {/* Pricing toggle */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white">
              <button
                onClick={() => setPricingMode('market')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  pricingMode === 'market' ? 'bg-primary-700 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Market Price
              </button>
              <button
                onClick={() => setPricingMode('custom')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                  pricingMode === 'custom' ? 'bg-primary-700 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Custom
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Input Form */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="space-y-3">
              {/* Length & Breadth */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Length &amp; Breadth</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Length (ft)</label>
                    <input
                      type="number"
                      value={formData.length}
                      onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      placeholder="e.g. 40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Breadth (ft)</label>
                    <input
                      type="number"
                      value={formData.breadth}
                      onChange={(e) => setFormData({ ...formData, breadth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>
              </div>

              {/* OR Divider */}
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-3 text-xs font-bold text-gray-400 bg-white px-2 py-0.5 border border-gray-200 rounded-full">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Area */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Built-up Area (sq.ft)</label>
                <input
                  type="number"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="e.g. 1200"
                />
              </div>

              {/* Floors + footing in one row */}
              <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Number of Floors</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.floors}
                    onChange={(e) => setFormData({ ...formData, floors: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="includeFooting"
                    checked={formData.includeFooting}
                    onChange={(e) => setFormData({ ...formData, includeFooting: e.target.checked })}
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="includeFooting" className="text-xs text-gray-600">Include footing</label>
                </div>
              </div>

              {/* Custom Price Inputs - Only show in custom mode */}
              {pricingMode === 'custom' && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Material Prices</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cement (₹/bag)</label>
                      <input type="number" value={formData.priceCement} onChange={(e) => setFormData({ ...formData, priceCement: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="350" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Steel (₹/kg)</label>
                      <input type="number" value={formData.priceSteel} onChange={(e) => setFormData({ ...formData, priceSteel: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="72" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Sand (₹/cu.ft)</label>
                      <input type="number" value={formData.priceSand} onChange={(e) => setFormData({ ...formData, priceSand: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Aggregate (₹/cu.ft)</label>
                      <input type="number" value={formData.priceAgg} onChange={(e) => setFormData({ ...formData, priceAgg: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="70" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Bricks (₹/1000 nos)</label>
                      <input type="number" value={formData.priceBricks} onChange={(e) => setFormData({ ...formData, priceBricks: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="10000" />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={calculateMaterials}
                disabled={isCalculating}
                className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  isCalculating
                    ? 'bg-green-500 cursor-not-allowed'
                    : 'bg-primary-700 hover:bg-primary-800'
                } text-white`}
              >
                {isCalculating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Calculated ✓</span>
                  </>
                ) : (
                  'Calculate Materials'
                )}
              </button>
            </div>
          </div>

          {/* Results & Visualization */}
          <div className="space-y-6">
            {/* Grid Visualization */}
            {results && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Layout Visualization</h3>
                <div className="flex justify-center">
                  <canvas ref={canvasRef} className="border border-gray-200 rounded-lg"></canvas>
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Material Estimates</h3>

                {/* Project Overview */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">📐 Project Overview</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Dimensions:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {results.length} ft × {results.breadth} ft
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Area:</span>
                      <span className="ml-2 font-semibold text-gray-900">{results.area} sq.ft</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Floors:</span>
                      <span className="ml-2 font-semibold text-gray-900">{results.floors}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Columns:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {results.columns} ({results.colsX} × {results.colsY})
                      </span>
                    </div>
                  </div>
                  {results.assumedSquare && (
                    <p className="mt-2 text-xs text-primary-700">
                      ℹ️ Square footprint assumed from area
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Structure Materials Section */}
                  <div className="bg-primary-50 rounded-lg p-4">
                    <h4 className="font-semibold text-primary-900 mb-3 flex items-center">
                      🏗️ Structure Materials
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-primary-200 pb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Cement</p>
                          <p className="text-sm text-gray-600">{results.structureMaterials.cement.quantity} bags (50kg)</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">₹{results.structureMaterials.cement.pricePerUnit}/bag</p>
                          <p className="font-bold text-primary-700">₹{results.structureMaterials.cement.cost}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-b border-primary-200 pb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Steel (TMT Bars)</p>
                          <p className="text-sm text-gray-600">{results.structureMaterials.steel.quantity} kg</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">₹{results.structureMaterials.steel.pricePerUnit}/kg</p>
                          <p className="font-bold text-primary-700">₹{results.structureMaterials.steel.cost}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-b border-primary-200 pb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Sand (M-Sand)</p>
                          <p className="text-sm text-gray-600">{results.structureMaterials.sand.quantity} cu.ft</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">₹{results.structureMaterials.sand.pricePerUnit}/cu.ft</p>
                          <p className="font-bold text-primary-700">₹{results.structureMaterials.sand.cost}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-b border-primary-200 pb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Aggregate (20mm)</p>
                          <p className="text-sm text-gray-600">{results.structureMaterials.aggregate.quantity} cu.ft</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">₹{results.structureMaterials.aggregate.pricePerUnit}/cu.ft</p>
                          <p className="font-bold text-primary-700">₹{results.structureMaterials.aggregate.cost}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Bricks</p>
                          <p className="text-sm text-gray-600">{results.structureMaterials.bricks.quantity} nos</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">₹{results.structureMaterials.bricks.pricePerUnit}/brick</p>
                          <p className="font-bold text-primary-700">₹{results.structureMaterials.bricks.cost}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-primary-300 flex justify-between items-center">
                      <p className="font-semibold text-primary-900">Structure Subtotal:</p>
                      <p className="font-bold text-lg text-primary-900">₹{results.structureMaterials.totalCost}</p>
                    </div>
                  </div>

                  {/* Foundation Materials Section */}
                  {results.foundationMaterials && (
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                        🏗️ Foundation Materials
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Cement</p>
                            <p className="text-sm text-gray-600">{results.foundationMaterials.cement.quantity} bags (50kg)</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">₹{results.foundationMaterials.cement.pricePerUnit}/bag</p>
                            <p className="font-bold text-orange-600">₹{results.foundationMaterials.cement.cost}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Steel</p>
                            <p className="text-sm text-gray-600">{results.foundationMaterials.steel.quantity} kg</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">₹{results.foundationMaterials.steel.pricePerUnit}/kg</p>
                            <p className="font-bold text-orange-600">₹{results.foundationMaterials.steel.cost}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Sand</p>
                            <p className="text-sm text-gray-600">{results.foundationMaterials.sand.quantity} cu.ft</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">₹{results.foundationMaterials.sand.pricePerUnit}/cu.ft</p>
                            <p className="font-bold text-orange-600">₹{results.foundationMaterials.sand.cost}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Aggregate</p>
                            <p className="text-sm text-gray-600">{results.foundationMaterials.aggregate.quantity} cu.ft</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">₹{results.foundationMaterials.aggregate.pricePerUnit}/cu.ft</p>
                            <p className="font-bold text-orange-600">₹{results.foundationMaterials.aggregate.cost}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-orange-300 flex justify-between items-center">
                        <p className="font-semibold text-orange-900">Foundation Subtotal:</p>
                        <p className="font-bold text-lg text-orange-900">₹{results.foundationMaterials.totalCost}</p>
                      </div>
                    </div>
                  )}

                  {/* Total Section */}
                  <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300 bg-green-50 rounded-lg p-4">
                    <p className="text-lg font-bold text-gray-900">Total Estimated Cost</p>
                    <p className="text-2xl font-bold text-green-600">₹{results.totalCost}</p>
                  </div>
                </div>

                {/* Download PDF Button */}
                <button
                  onClick={handleDownloadPDF}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  <span>Download Report</span>
                </button>

                <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-800">
                    <strong>Note:</strong> These are approximate estimates. Actual requirements may vary based on design, wastage, and site conditions. Prices shown are indicative for Ranchi, Jharkhand market.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-primary-700 to-primary-900 rounded-xl shadow-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Buy Construction Materials?</h2>
          <p className="text-lg mb-6">Get quality materials delivered to your site in Ranchi</p>
          <a
            href="/products"
            className="inline-block bg-white text-primary-700 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            Browse Products
          </a>
        </div>
      </div>

      {/* Lead Capture Modal - Simple & Mobile-First */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">📥 Download Your Estimate</h3>
            <p className="text-sm text-gray-600 mb-6">Enter your details to download the report</p>

            {/* Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={leadData.name}
                onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter your name"
                autoFocus
              />
            </div>

            {/* Phone Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={leadData.phone}
                onChange={(e) => setLeadData({ ...leadData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="10-digit mobile number"
                maxLength="10"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeadModal(false);
                  setLeadData({ name: '', phone: '' });
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generatePDF}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calculator;
