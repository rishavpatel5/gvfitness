const PDFDocument = require('pdfkit');

/**
 * Dynamically generates a professional GV Fitness Diet Plan PDF and streams it directly to a writable stream.
 * Zero files are stored on disk.
 */
function generateDietPlanPDF(snapshot, stream) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true
  });

  doc.pipe(stream);

  const PRIMARY_RED = '#E11D48';
  const DARK_NAVY = '#0F172A';
  const TEXT_MUTED = '#64748B';
  const LIGHT_BG = '#F8FAFC';
  const BORDER_COLOR = '#E2E8F0';

  // 1. TOP HEADER BANNER
  doc.rect(40, 40, 515, 60).fill(DARK_NAVY);
  doc.rect(40, 96, 515, 4).fill(PRIMARY_RED);

  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
    .text('GV FITNESS', 55, 52);
  doc.fontSize(10).font('Helvetica')
    .fillColor('#94A3B8')
    .text('PERSONALIZED NUTRITION & DIET PLAN', 55, 78);

  doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
    .text(snapshot.goalName ? snapshot.goalName.toUpperCase() : 'FITNESS DIET', 380, 56, { width: 160, align: 'right' });
  doc.fontSize(9).font('Helvetica')
    .fillColor(PRIMARY_RED)
    .text(snapshot.dietaryPreference || 'General Plan', 380, 74, { width: 160, align: 'right' });

  // 2. MEMBER PROFILE CARD
  const cardTop = 115;
  doc.rect(40, cardTop, 515, 80).fill(LIGHT_BG);
  doc.rect(40, cardTop, 515, 80).stroke(BORDER_COLOR);

  doc.fillColor(DARK_NAVY).fontSize(10).font('Helvetica-Bold')
    .text('MEMBER PROFILE', 55, cardTop + 10);

  doc.fontSize(9).font('Helvetica').fillColor(DARK_NAVY);
  // Column 1
  doc.text(`Name: `, 55, cardTop + 28, { continued: true }).font('Helvetica-Bold').text(snapshot.memberName || '-');
  doc.font('Helvetica').text(`Gender / Age: `, 55, cardTop + 44, { continued: true }).font('Helvetica-Bold').text(`${snapshot.gender || '-'} / ${snapshot.age ? snapshot.age + ' yrs' : '-'}`);
  doc.font('Helvetica').text(`Fitness Level: `, 55, cardTop + 60, { continued: true }).font('Helvetica-Bold').text(snapshot.fitness_level || 'Beginner');

  // Column 2
  doc.font('Helvetica').text(`Height: `, 230, cardTop + 28, { continued: true }).font('Helvetica-Bold').text(snapshot.height_cm ? `${snapshot.height_cm} cm` : '-');
  doc.font('Helvetica').text(`Weight: `, 230, cardTop + 44, { continued: true }).font('Helvetica-Bold').text(snapshot.weight_kg ? `${snapshot.weight_kg} kg` : '-');
  doc.font('Helvetica').text(`BMI: `, 230, cardTop + 60, { continued: true }).font('Helvetica-Bold').fillColor(PRIMARY_RED).text(`${snapshot.bmi || '-'} (${snapshot.bmiCategory || 'Normal'})`);

  // Column 3
  doc.font('Helvetica').fillColor(DARK_NAVY).text(`Goal: `, 390, cardTop + 28, { continued: true }).font('Helvetica-Bold').text(snapshot.goalName || '-');
  doc.font('Helvetica').text(`Preference: `, 390, cardTop + 44, { continued: true }).font('Helvetica-Bold').text(snapshot.dietaryPreference || '-');
  doc.font('Helvetica').text(`Date: `, 390, cardTop + 60, { continued: true }).font('Helvetica-Bold').text(snapshot.generatedDate || new Date().toLocaleDateString('en-IN'));

  // 3. MEALS SECTIONS
  let currentY = 210;

  doc.fillColor(DARK_NAVY).fontSize(13).font('Helvetica-Bold')
    .text('MEAL SCHEDULE & NUTRITION GUIDE', 40, currentY);
  currentY += 22;

  const meals = Array.isArray(snapshot.meals) ? snapshot.meals : [];

  if (meals.length === 0) {
    doc.rect(40, currentY, 515, 45).fill(LIGHT_BG).stroke(BORDER_COLOR);
    doc.fillColor(TEXT_MUTED).fontSize(10).font('Helvetica-Oblique')
      .text('General balanced nutrition plan as instructed by your GV Fitness trainer.', 55, currentY + 16);
    currentY += 60;
  } else {
    meals.forEach((meal, mealIdx) => {
      // Check if page break needed
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      // Meal Header
      doc.rect(40, currentY, 515, 24).fill(PRIMARY_RED);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
        .text(`MEAL ${mealIdx + 1}: ${meal.name ? meal.name.toUpperCase() : 'MEAL'}`, 50, currentY + 7);
      currentY += 24;

      const items = Array.isArray(meal.items) ? meal.items : [];
      const itemHeight = Math.max(items.length * 22, 28) + 10;

      // Meal Body Container
      doc.rect(40, currentY, 515, itemHeight).fill(LIGHT_BG).stroke(BORDER_COLOR);

      if (items.length === 0) {
        doc.fillColor(TEXT_MUTED).fontSize(9).font('Helvetica-Oblique')
          .text('As recommended by coach.', 55, currentY + 8);
      } else {
        let itemY = currentY + 8;
        items.forEach((item) => {
          doc.fillColor(DARK_NAVY).fontSize(9).font('Helvetica-Bold')
            .text(`•  ${item.name || 'Food Item'}`, 55, itemY, { width: 280 });

          if (item.quantity) {
            doc.fillColor(PRIMARY_RED).font('Helvetica-Bold')
              .text(item.quantity, 340, itemY, { width: 100, align: 'left' });
          }

          if (item.notes) {
            doc.fillColor(TEXT_MUTED).font('Helvetica-Oblique').fontSize(8)
              .text(item.notes, 440, itemY + 1, { width: 105, align: 'right' });
          }

          itemY += 20;
        });
      }

      currentY += itemHeight + 12;
    });
  }

  // 4. GENERAL INSTRUCTIONS & GUIDELINES
  if (currentY > 660) {
    doc.addPage();
    currentY = 50;
  }

  doc.rect(40, currentY, 515, 22).fill(DARK_NAVY);
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
    .text('COACH INSTRUCTIONS & HYDRATION GUIDELINES', 50, currentY + 6);
  currentY += 22;

  const instructionsText = snapshot.instructions ||
    '1. Drink at least 3 to 4 liters of clean water daily to stay optimally hydrated.\n' +
    '2. Maintain a consistent meal timing window for optimal metabolism and recovery.\n' +
    '3. Aim for 7 to 8 hours of quality sleep for muscle repair and fat loss.\n' +
    '4. Consult with your GV Fitness trainer before adding any unprescribed supplements.';

  const instructionsHeight = 65;
  doc.rect(40, currentY, 515, instructionsHeight).fill(LIGHT_BG).stroke(BORDER_COLOR);
  doc.fillColor(DARK_NAVY).fontSize(8.5).font('Helvetica')
    .text(instructionsText, 52, currentY + 8, { width: 495, lineGap: 3 });
  currentY += instructionsHeight + 16;

  // 5. FOOTER NOTICE
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.rect(40, 785, 515, 20).fill('#F1F5F9');
    doc.fillColor(TEXT_MUTED).fontSize(7.5).font('Helvetica')
      .text('GV FITNESS • Dedicated To Your Health & Transformation • Temporary Link Valid for 14 Days • Please save this PDF to your device.', 50, 791, { align: 'center', width: 495 });
  }

  doc.end();
}

module.exports = { generateDietPlanPDF };

